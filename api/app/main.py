from fastapi import Depends, FastAPI
from pydantic import BaseModel

from app.schemas import SemanticComparisonRequest, SemanticComparisonResponse
from app.services.embedding import EmbeddingService, get_embedding_service


class HealthResponse(BaseModel):
    status: str
    service: str


app = FastAPI(title="JobFit API", version="0.2.0")


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
