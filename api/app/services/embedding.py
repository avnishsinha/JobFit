from functools import lru_cache
from typing import Protocol, Sequence

import numpy as np
from sentence_transformers import SentenceTransformer

MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"


class EmbeddingService(Protocol):
    model_id: str

    def similarity(self, text_a: str, text_b: str) -> float:
        ...


class SentenceTransformerEmbeddingService:
    model_id = MODEL_ID

    def __init__(self) -> None:
        self._model = SentenceTransformer(self.model_id)

    def similarity(self, text_a: str, text_b: str) -> float:
        embeddings = self._model.encode(
            [text_a, text_b],
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        return cosine_similarity(embeddings[0], embeddings[1])


def cosine_similarity(vector_a: Sequence[float], vector_b: Sequence[float]) -> float:
    array_a = np.asarray(vector_a, dtype=np.float64)
    array_b = np.asarray(vector_b, dtype=np.float64)

    if array_a.ndim != 1 or array_b.ndim != 1 or array_a.shape != array_b.shape:
        raise ValueError("Embedding vectors must be one-dimensional and equal-sized.")

    norm_a = np.linalg.norm(array_a)
    norm_b = np.linalg.norm(array_b)
    if norm_a == 0 or norm_b == 0:
        raise ValueError("Embedding vectors must not be zero-length.")

    similarity = float(np.dot(array_a, array_b) / (norm_a * norm_b))
    return float(np.clip(similarity, -1.0, 1.0))


@lru_cache(maxsize=1)
def get_embedding_service() -> SentenceTransformerEmbeddingService:
    return SentenceTransformerEmbeddingService()
