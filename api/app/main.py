import os
import logging
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import stripe
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import COOKIE_NAME, get_current_user, hash_password, set_session_cookie, verify_password
from app.config import settings, validate_production_settings
from app.db import get_db
from app.models import Analysis, AnalysisRequirement, Job, Resume, UsageRecord, User
from app.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    AnalysisCreateRequest,
    AnalysisSummaryResponse,
    AuthRequest,
    BillingResponse,
    CheckoutResponse,
    JobCreateRequest,
    JobResponse,
    ResumeResponse,
    SemanticComparisonRequest,
    SemanticComparisonResponse,
    UserResponse,
)
from app.services.analysis import analyze_jobfit
from app.services.billing import create_checkout_session, create_portal_session, process_webhook
from app.services.pdf import extract_pdf_text
from app.services.persistence import (
    analysis_summary,
    analysis_to_response,
    ensure_analysis_entitlement,
    get_or_create_subscription,
    record_analysis_usage,
)
from app.services.embedding import EmbeddingService, get_embedding_service

logger = logging.getLogger("jobfit")
request_history: dict[str, deque[float]] = defaultdict(deque)

class HealthResponse(BaseModel):
    status: str
    service: str


app = FastAPI(title="JobFit API", version="0.3.0")
validate_production_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        settings.frontend_origin,
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    allow_credentials=True,
)


@app.middleware("http")
async def production_middleware(request: Request, call_next):
    started = time.monotonic()
    client_key = request.client.host if request.client else "unknown"
    if request.url.path in {"/auth/login", "/auth/signup", "/compare", "/analyze", "/analyses"}:
        now = time.monotonic()
        history = request_history[client_key]
        while history and now - history[0] > 60:
            history.popleft()
        if len(history) >= 60:
            return Response("Rate limit exceeded.", status_code=429, media_type="text/plain")
        history.append(now)
    if request.url.path == "/resumes":
        length = request.headers.get("content-length")
        if length and int(length) > settings.max_upload_bytes + 256_000:
            return Response("Upload is too large.", status_code=413, media_type="text/plain")
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    logger.info("%s %s %s %.3fs", request.method, request.url.path, response.status_code, time.monotonic() - started)
    return response


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="jobfit-api")


@app.get("/ready")
def ready(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(select(1))
    return {"status": "ready"}


@app.post("/auth/signup", response_model=UserResponse, status_code=201)
def signup(request: AuthRequest, response: Response, db: Session = Depends(get_db)) -> UserResponse:
    if db.scalar(select(User).where(User.email == request.email)):
        raise HTTPException(status_code=409, detail="An account with that email already exists.")
    user = User(email=request.email, password_hash=hash_password(request.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    set_session_cookie(response, user.id)
    return UserResponse(id=user.id, email=user.email)


@app.post("/auth/login", response_model=UserResponse)
def login(request: AuthRequest, response: Response, db: Session = Depends(get_db)) -> UserResponse:
    user = db.scalar(select(User).where(User.email == request.email))
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    set_session_cookie(response, user.id)
    return UserResponse(id=user.id, email=user.email)


@app.post("/auth/logout", status_code=204)
def logout(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME)


@app.get("/auth/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse(id=user.id, email=user.email)


@app.post(
    "/compare",
    response_model=SemanticComparisonResponse,
)
def compare_semantic_text(
    request: SemanticComparisonRequest,
    embedding_service: EmbeddingService = Depends(get_embedding_service),
) -> SemanticComparisonResponse:
    return SemanticComparisonResponse(
        similarity=embedding_service.similarity(request.text_a, request.text_b),
        model=embedding_service.model_id,
    )


@app.post("/analyze", response_model=AnalysisResponse)
def analyze(
    request: AnalysisRequest,
    embedding_service: EmbeddingService = Depends(get_embedding_service),
) -> AnalysisResponse:
    try:
        return analyze_jobfit(
            request.resume_text,
            request.job_description,
            embedding_service,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/jobs", response_model=JobResponse, status_code=201)
def create_job(
    request: JobCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobResponse:
    job = Job(user_id=user.id, **request.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return JobResponse(id=job.id, created_at=job.created_at.isoformat(), **request.model_dump())


@app.get("/jobs", response_model=list[JobResponse])
def list_jobs(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[JobResponse]:
    jobs = db.scalars(select(Job).where(Job.user_id == user.id).order_by(Job.created_at.desc())).all()
    return [JobResponse(id=item.id, created_at=item.created_at.isoformat(), title=item.title, company=item.company, description=item.description, url=item.url) for item in jobs]


@app.delete("/jobs/{job_id}", status_code=204)
def delete_job(job_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    job = db.scalar(select(Job).where(Job.id == job_id, Job.user_id == user.id))
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    db.delete(job)
    db.commit()


@app.post("/resumes", response_model=ResumeResponse, status_code=201)
def upload_resume(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResumeResponse:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Only PDF resumes are supported.")
    content = file.file.read(settings.max_upload_bytes + 1)
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Resume file is too large.")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=415, detail="The uploaded file is not a valid PDF.")
    try:
        text = extract_pdf_text(content)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    resume = Resume(user_id=user.id, name=file.filename or "Resume.pdf", text=text)
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return ResumeResponse(id=resume.id, name=resume.name, created_at=resume.created_at.isoformat())


@app.get("/resumes", response_model=list[ResumeResponse])
def list_resumes(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[ResumeResponse]:
    resumes = db.scalars(select(Resume).where(Resume.user_id == user.id).order_by(Resume.created_at.desc())).all()
    return [ResumeResponse(id=item.id, name=item.name, created_at=item.created_at.isoformat()) for item in resumes]


@app.delete("/resumes/{resume_id}", status_code=204)
def delete_resume(resume_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    resume = db.scalar(select(Resume).where(Resume.id == resume_id, Resume.user_id == user.id))
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    db.delete(resume)
    db.commit()


@app.post("/analyses", response_model=AnalysisSummaryResponse, status_code=201)
def create_analysis(
    request: AnalysisCreateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    embedding_service: EmbeddingService = Depends(get_embedding_service),
) -> AnalysisSummaryResponse:
    resume = db.scalar(select(Resume).where(Resume.id == request.resume_id, Resume.user_id == user.id))
    job = db.scalar(select(Job).where(Job.id == request.job_id, Job.user_id == user.id))
    if not resume or not job:
        raise HTTPException(status_code=404, detail="Resume or job not found.")
    try:
        ensure_analysis_entitlement(db, user.id)
        result = analyze_jobfit(resume.text, job.description, embedding_service)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    analysis = Analysis(
        user_id=user.id,
        resume_id=resume.id,
        job_id=job.id,
        overall_compatibility=result.overall_compatibility,
        model_id=result.model,
        scoring_version=result.scoring.version,
        strong_threshold=result.scoring.strong_match_threshold,
        partial_threshold=result.scoring.partial_match_threshold,
    )
    analysis.requirements = [
        AnalysisRequirement(position=index, **item.model_dump())
        for index, item in enumerate(result.requirements)
    ]
    db.add(analysis)
    record_analysis_usage(db, user.id)
    db.commit()
    db.refresh(analysis)
    return analysis_summary(analysis)  # type: ignore[return-value]


@app.get("/analyses", response_model=list[AnalysisSummaryResponse])
def list_analyses(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[AnalysisSummaryResponse]:
    analyses = db.scalars(select(Analysis).where(Analysis.user_id == user.id).order_by(Analysis.created_at.desc())).all()
    return [analysis_summary(item) for item in analyses]  # type: ignore[return-value]


@app.get("/analyses/{analysis_id}", response_model=AnalysisResponse)
def get_analysis(analysis_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> AnalysisResponse:
    analysis = db.scalar(select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user.id))
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return analysis_to_response(analysis)


@app.delete("/analyses/{analysis_id}", status_code=204)
def delete_analysis(analysis_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    analysis = db.scalar(select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user.id))
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    db.delete(analysis)
    db.commit()


@app.get("/billing", response_model=BillingResponse)
def billing(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> BillingResponse:
    subscription = get_or_create_subscription(db, user.id)
    db.commit()
    period_key = datetime.now(timezone.utc).strftime("%Y-%m")
    usage = db.scalar(select(UsageRecord).where(UsageRecord.user_id == user.id, UsageRecord.period_key == period_key))
    limit = None if subscription.plan == "pro" and subscription.status in {"active", "trialing"} else 5
    return BillingResponse(plan=subscription.plan, status=subscription.status, analyses_used=usage.analysis_count if usage else 0, analyses_limit=limit)


@app.post("/billing/checkout", response_model=CheckoutResponse)
def checkout(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> CheckoutResponse:
    try:
        return CheckoutResponse(url=create_checkout_session(db, user))
    except ValueError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/billing/portal", response_model=CheckoutResponse)
def portal(user: User = Depends(get_current_user)) -> CheckoutResponse:
    try:
        return CheckoutResponse(url=create_portal_session(user))
    except ValueError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/billing/webhook", status_code=204)
async def billing_webhook(request: Request, db: Session = Depends(get_db)) -> None:
    signature = request.headers.get("stripe-signature", "")
    try:
        process_webhook(db, await request.body(), signature)
        db.commit()
    except (ValueError, stripe.error.SignatureVerificationError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
