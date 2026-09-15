import os

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    SemanticComparisonRequest,
    SemanticComparisonResponse,
)
from app.services.analysis import analyze_jobfit
from app.services.embedding import EmbeddingService, get_embedding_service


class HealthResponse(BaseModel):
    status: str
    service: str


app = FastAPI(title="JobFit API", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_ORIGIN", ""),
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="jobfit-api")


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
