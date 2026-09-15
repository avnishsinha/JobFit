from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Analysis, AnalysisRequirement, Job, Resume, Subscription, UsageRecord
from app.schemas import AnalysisResponse

FREE_ANALYSIS_LIMIT = 5


def get_or_create_subscription(db: Session, user_id: str) -> Subscription:
    subscription = db.scalar(select(Subscription).where(Subscription.user_id == user_id))
    if not subscription:
        subscription = Subscription(user_id=user_id)
        db.add(subscription)
        db.flush()
    return subscription


def ensure_analysis_entitlement(db: Session, user_id: str) -> None:
    subscription = get_or_create_subscription(db, user_id)
    if subscription.plan == "pro" and subscription.status in {"active", "trialing"}:
        return
    period_key = datetime.now(timezone.utc).strftime("%Y-%m")
    usage = db.scalar(
        select(UsageRecord).where(
            UsageRecord.user_id == user_id,
            UsageRecord.period_key == period_key,
        )
    )
    if usage and usage.analysis_count >= FREE_ANALYSIS_LIMIT:
        raise ValueError("Free plan monthly analysis limit reached.")


def record_analysis_usage(db: Session, user_id: str) -> None:
    period_key = datetime.now(timezone.utc).strftime("%Y-%m")
    usage = db.scalar(
        select(UsageRecord).where(
            UsageRecord.user_id == user_id,
            UsageRecord.period_key == period_key,
        )
    )
    if not usage:
        usage = UsageRecord(user_id=user_id, period_key=period_key, analysis_count=0)
        db.add(usage)
    usage.analysis_count += 1


def analysis_to_response(analysis: Analysis) -> AnalysisResponse:
    return AnalysisResponse(
        overall_compatibility=analysis.overall_compatibility,
        requirements=[
            {
                "requirement": item.requirement,
                "classification": item.classification,
                "similarity": item.similarity,
                "supporting_evidence": item.supporting_evidence,
                "explanation": item.explanation,
            }
            for item in analysis.requirements
        ],
        model=analysis.model_id,
        scoring={
            "version": analysis.scoring_version,
            "strong_match_threshold": analysis.strong_threshold,
            "partial_match_threshold": analysis.partial_threshold,
        },
    )


def analysis_summary(analysis: Analysis) -> dict[str, object]:
    return {
        "id": analysis.id,
        "resume_id": analysis.resume_id,
        "job_id": analysis.job_id,
        "overall_compatibility": analysis.overall_compatibility,
        "model": analysis.model_id,
        "scoring": {
            "version": analysis.scoring_version,
            "strong_match_threshold": analysis.strong_threshold,
            "partial_match_threshold": analysis.partial_threshold,
        },
        "created_at": analysis.created_at.isoformat() if analysis.created_at else "",
    }
