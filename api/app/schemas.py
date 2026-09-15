from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SemanticComparisonRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    text_a: str = Field(min_length=1)
    text_b: str = Field(min_length=1)

    @field_validator("text_a", "text_b")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        if not value:
            raise ValueError("Text inputs must not be blank.")
        return value


class SemanticComparisonResponse(BaseModel):
    similarity: float = Field(ge=-1.0, le=1.0)
    model: str


class AnalysisRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    resume_text: str = Field(min_length=1, max_length=100_000)
    job_description: str = Field(min_length=1, max_length=100_000)

    @field_validator("resume_text", "job_description")
    @classmethod
    def reject_blank_analysis_input(cls, value: str) -> str:
        if not value:
            raise ValueError("Analysis inputs must not be blank.")
        return value


class ScoringConfiguration(BaseModel):
    version: str
    strong_match_threshold: float = Field(ge=-1.0, le=1.0)
    partial_match_threshold: float = Field(ge=-1.0, le=1.0)


class RequirementResult(BaseModel):
    requirement: str
    classification: str
    similarity: float = Field(ge=-1.0, le=1.0)
    supporting_evidence: Optional[str]
    explanation: str


class AnalysisResponse(BaseModel):
    overall_compatibility: float = Field(ge=0.0, le=100.0)
    requirements: list[RequirementResult]
    model: str
    scoring: ScoringConfiguration
