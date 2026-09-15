import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.analysis import (
    AnalysisConfig,
    analyze_jobfit,
    classify_similarity,
    extract_requirements,
    segment_resume_evidence,
)
from app.services.embedding import get_embedding_service


class AnalysisEmbeddingService:
    model_id = "test-model"

    def similarity(self, text_a: str, text_b: str) -> float:
        if "REST APIs" in text_a and "REST APIs" in text_b:
            return 0.85
        if "data analysis" in text_a and "data analysis" in text_b:
            return 0.55
        return 0.2


@pytest.fixture
def client() -> TestClient:
    app.dependency_overrides[get_embedding_service] = AnalysisEmbeddingService
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_extract_requirements_uses_bullets_and_deduplicates() -> None:
    description = """
    Requirements:
    - Experience developing REST APIs.
    - Experience developing REST APIs.
    - Strong data analysis skills.
    """

    assert extract_requirements(description) == [
        "Experience developing REST APIs",
        "Strong data analysis skills",
    ]


def test_extract_requirements_handles_prose_sentences() -> None:
    description = "Experience with Python. Ability to design reliable services."

    assert extract_requirements(description) == [
        "Experience with Python",
        "Ability to design reliable services",
    ]


def test_segment_resume_evidence_preserves_supplied_units() -> None:
    resume = "Jane Doe\n\n- Built REST APIs with Python.\n- Led a data migration."

    assert segment_resume_evidence(resume) == [
        "Jane Doe",
        "Built REST APIs with Python.",
        "Led a data migration.",
    ]


@pytest.mark.parametrize(
    ("similarity", "expected"),
    [
        (0.70, "Strong Match"),
        (0.69, "Partial Match"),
        (0.45, "Partial Match"),
        (0.44, "No Evidence"),
    ],
)
def test_classification_boundaries(similarity: float, expected: str) -> None:
    assert classify_similarity(similarity, AnalysisConfig()) == expected


def test_analysis_selects_best_evidence_and_calculates_overall_score() -> None:
    result = analyze_jobfit(
        "Built REST APIs with Python.\nPerformed data analysis for reporting.",
        "- Experience developing REST APIs.\n- Strong data analysis skills.\n- Knowledge of gardening.",
        AnalysisEmbeddingService(),
    )

    assert [item.classification for item in result.requirements] == [
        "Strong Match",
        "Partial Match",
        "No Evidence",
    ]
    assert result.requirements[0].supporting_evidence == "Built REST APIs with Python."
    assert result.requirements[2].supporting_evidence is None
    assert result.overall_compatibility == pytest.approx(50.0)
    assert result.scoring.version == "phase-3-v1"


def test_analysis_is_deterministic() -> None:
    kwargs = {
        "resume_text": "Built REST APIs with Python.\nPerformed data analysis.",
        "job_description": "- Experience developing REST APIs.\n- Strong data analysis skills.",
        "embedding_service": AnalysisEmbeddingService(),
    }

    assert analyze_jobfit(**kwargs) == analyze_jobfit(**kwargs)


def test_analysis_api_contract(client: TestClient) -> None:
    response = client.post(
        "/analyze",
        json={
            "resume_text": "Built REST APIs with Python.",
            "job_description": "- Experience developing REST APIs.",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "overall_compatibility",
        "requirements",
        "model",
        "scoring",
    }
    assert body["model"] == "test-model"
    assert set(body["requirements"][0]) == {
        "requirement",
        "classification",
        "similarity",
        "supporting_evidence",
        "explanation",
    }


@pytest.mark.parametrize(
    "payload",
    [
        {"resume_text": " ", "job_description": "Experience with Python."},
        {"resume_text": "Some experience.", "job_description": " "},
        {"resume_text": "Some experience."},
    ],
)
def test_analysis_api_rejects_invalid_input(
    client: TestClient, payload: dict[str, str]
) -> None:
    assert client.post("/analyze", json=payload).status_code == 422
