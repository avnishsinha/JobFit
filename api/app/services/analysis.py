from dataclasses import dataclass
import re
from typing import Optional

from app.schemas import (
    AnalysisResponse,
    RequirementResult,
    ScoringConfiguration,
)
from app.services.embedding import EmbeddingService


STRONG_MATCH = "Strong Match"
PARTIAL_MATCH = "Partial Match"
NO_EVIDENCE = "No Evidence"
REQUIREMENT_CUES = (
    "ability",
    "background",
    "experience",
    "familiar",
    "knowledge",
    "must",
    "proficiency",
    "preferred",
    "responsible",
    "skill",
    "strong",
    "understanding",
)
ACTION_CUES = (
    "analyze",
    "build",
    "create",
    "design",
    "develop",
    "implement",
    "maintain",
    "manage",
    "operate",
    "work",
)


@dataclass(frozen=True)
class AnalysisConfig:
    version: str = "phase-3-v1"
    strong_match_threshold: float = 0.70
    partial_match_threshold: float = 0.45

    def __post_init__(self) -> None:
        if not -1.0 <= self.partial_match_threshold <= self.strong_match_threshold <= 1.0:
            raise ValueError("Scoring thresholds must be ordered between -1.0 and 1.0.")

    def as_schema(self) -> ScoringConfiguration:
        return ScoringConfiguration(
            version=self.version,
            strong_match_threshold=self.strong_match_threshold,
            partial_match_threshold=self.partial_match_threshold,
        )


def _clean_requirement(value: str) -> str:
    cleaned = re.sub(r"^\s*(?:[-*•]|\d+[.)])\s*", "", value)
    cleaned = re.sub(r"^(?:requirements?|responsibilities?|qualifications?)\s*:\s*", "", cleaned, flags=re.I)
    return re.sub(r"\s+", " ", cleaned).strip(" .;:")


def _looks_like_requirement(value: str) -> bool:
    lowered = value.lower()
    return any(cue in lowered for cue in REQUIREMENT_CUES + ACTION_CUES)


def extract_requirements(job_description: str) -> list[str]:
    lines = [line.strip() for line in job_description.replace("\r\n", "\n").split("\n") if line.strip()]
    bullet_lines = [line for line in lines if re.match(r"^(?:[-*•]|\d+[.)])\s+", line)]
    candidates = bullet_lines or [
        sentence.strip()
        for block in lines
        for sentence in re.split(r"(?<=[.!?])\s+", block)
        if sentence.strip()
    ]

    requirements: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        requirement = _clean_requirement(candidate)
        key = requirement.casefold()
        if requirement and key not in seen and _looks_like_requirement(requirement):
            requirements.append(requirement)
            seen.add(key)
    return requirements


def segment_resume_evidence(resume_text: str) -> list[str]:
    units: list[str] = []
    for paragraph in re.split(r"\n\s*\n", resume_text.replace("\r\n", "\n")):
        for line in paragraph.splitlines():
            cleaned = re.sub(r"^\s*(?:[-*•]|\d+[.)])\s*", "", line)
            cleaned = re.sub(r"\s+", " ", cleaned).strip()
            if cleaned:
                units.append(cleaned)
    return units


def classify_similarity(similarity: float, config: AnalysisConfig) -> str:
    if similarity >= config.strong_match_threshold:
        return STRONG_MATCH
    if similarity >= config.partial_match_threshold:
        return PARTIAL_MATCH
    return NO_EVIDENCE


def _classification_points(classification: str) -> float:
    return {STRONG_MATCH: 1.0, PARTIAL_MATCH: 0.5, NO_EVIDENCE: 0.0}[classification]


def analyze_jobfit(
    resume_text: str,
    job_description: str,
    embedding_service: EmbeddingService,
    config: Optional[AnalysisConfig] = None,
) -> AnalysisResponse:
    scoring = config or AnalysisConfig()
    requirements = extract_requirements(job_description)
    evidence_units = segment_resume_evidence(resume_text)
    if not requirements:
        raise ValueError("No job requirements could be extracted from the job description.")
    if not evidence_units:
        raise ValueError("No resume evidence could be extracted from the resume.")

    results: list[RequirementResult] = []
    for requirement in requirements:
        scored_evidence = [
            (embedding_service.similarity(requirement, evidence), evidence)
            for evidence in evidence_units
        ]
        similarity, evidence = max(scored_evidence, key=lambda item: (item[0], item[1]))
        classification = classify_similarity(similarity, scoring)
        support = evidence if classification != NO_EVIDENCE else None
        explanation = {
            STRONG_MATCH: "The strongest resume evidence is semantically close to this requirement.",
            PARTIAL_MATCH: "The resume contains related evidence, but the similarity is below the strong-match threshold.",
            NO_EVIDENCE: "No supplied resume evidence reached the partial-match threshold.",
        }[classification]
        results.append(
            RequirementResult(
                requirement=requirement,
                classification=classification,
                similarity=similarity,
                supporting_evidence=support,
                explanation=explanation,
            )
        )

    overall = 100.0 * sum(_classification_points(result.classification) for result in results) / len(results)
    return AnalysisResponse(
        overall_compatibility=overall,
        requirements=results,
        model=embedding_service.model_id,
        scoring=scoring.as_schema(),
    )
