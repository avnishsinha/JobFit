import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.embedding import get_embedding_service


class FakeEmbeddingService:
    model_id = "test-model"

    def similarity(self, text_a: str, text_b: str) -> float:
        if text_a == text_b:
            return 1.0
        if {"backend", "rest", "api"}.intersection(text_a.lower().split()) and {
            "backend",
            "rest",
            "api",
        }.intersection(text_b.lower().split()):
            return 0.82
        return 0.04


@pytest.fixture
def client() -> TestClient:
    app.dependency_overrides[get_embedding_service] = FakeEmbeddingService
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_compare_identical_text_returns_perfect_similarity(
    client: TestClient,
) -> None:
    response = client.post(
        "/compare",
        json={"text_a": "Built backend REST APIs.", "text_b": "Built backend REST APIs."},
    )

    assert response.status_code == 200
    assert response.json() == {"similarity": 1.0, "model": "test-model"}


def test_compare_related_text_returns_high_similarity(client: TestClient) -> None:
    response = client.post(
        "/compare",
        json={
            "text_a": "Developed backend REST services.",
            "text_b": "Built APIs for backend web applications.",
        },
    )

    assert response.status_code == 200
    assert response.json()["similarity"] > 0.8


def test_compare_unrelated_text_returns_low_similarity(client: TestClient) -> None:
    response = client.post(
        "/compare",
        json={
            "text_a": "Developed backend REST services.",
            "text_b": "Planted vegetables in a community garden.",
        },
    )

    assert response.status_code == 200
    assert response.json()["similarity"] < 0.1


@pytest.mark.parametrize(
    "payload",
    [
        {"text_a": "", "text_b": "valid text"},
        {"text_a": "   ", "text_b": "valid text"},
        {"text_a": "valid text"},
        {"text_a": 42, "text_b": "valid text"},
    ],
)
def test_compare_rejects_invalid_input(
    client: TestClient, payload: dict[str, object]
) -> None:
    response = client.post("/compare", json=payload)

    assert response.status_code == 422


def test_compare_response_contract(client: TestClient) -> None:
    response = client.post(
        "/compare",
        json={"text_a": "one", "text_b": "two"},
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"similarity", "model"}
    assert isinstance(body["similarity"], float)
    assert isinstance(body["model"], str)
