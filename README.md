# JobFit

JobFit is an explainable AI job-to-resume matching application.

It analyzes how well the experience represented in a resume aligns with
the requirements of a job description using semantic NLP models from the
Hugging Face ecosystem.

## Status

Early development.

JobFit is being built incrementally according to `ROADMAP.md`.

## Core Idea

Traditional keyword matching can miss relationships such as:

Job requirement:

> Experience developing backend web services.

Resume:

> Built REST APIs using Java and PostgreSQL.

JobFit uses semantic embeddings to identify relationships beyond exact
keyword overlap and provides evidence explaining its analysis.

## Planned Stack

**Frontend**
- Next.js
- React
- TypeScript
- Tailwind CSS

**Backend**
- Python
- FastAPI
- Pydantic

**Machine Learning**
- Hugging Face
- Sentence Transformers

**Data**
- PostgreSQL when persistence is introduced

## Repository Structure

The intended initial structure is:

    JobFit/
    ├── web/                  # Next.js frontend
    ├── api/                  # FastAPI backend
    ├── docs/                 # Architecture and engineering decisions
    ├── AGENTS.md
    ├── PROJECT_SPEC.md
    ├── ROADMAP.md
    └── README.md

The implementation will be created phase-by-phase. This README should be
updated to reflect the repository as it actually exists.

## Development

Local development instructions will be added during Phase 1 once the
frontend and backend foundations exist.

## Principles

JobFit prioritizes:

- explainable results
- honest scoring
- user privacy
- simple architecture
- deterministic behavior where practical
- production-quality engineering

JobFit does not claim to predict hiring outcomes or ATS decisions.

## Roadmap

See `ROADMAP.md`.

## License

License to be decided.