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

The current application provides a Next.js frontend and FastAPI backend with
private workspaces, PDF resume ingestion, saved jobs/analyses, semantic
analysis, and Stripe billing hooks. Use two terminals
from the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r api/requirements.txt
python3 -m alembic --config api/alembic.ini upgrade head
python3 -m uvicorn app.main:app --app-dir api --reload
```

```bash
cd web
npm install
npm run dev
```

Open <http://localhost:3000>. Copy `.env.example` to `web/.env.local` and
configure `NEXT_PUBLIC_BACKEND_URL` if the API is running at a different URL.

Run backend tests with `pytest api`, and run frontend checks with:

```bash
cd web
npm run lint
npm run typecheck
npm run build
```

The first request to `POST /compare` or `POST /analyze` downloads
`sentence-transformers/all-MiniLM-L6-v2` from Hugging Face if it is not
already cached. The backend keeps the model loaded for reuse within the
process.

Create an account, upload a PDF resume, save a job description, and run an
analysis from the private workspace. The free plan allows five analyses per
UTC month. Stripe checkout is available when the Stripe variables in
`.env.example` are configured.

Example comparison request:

```bash
curl -X POST http://127.0.0.1:8000/compare \
  -H 'Content-Type: application/json' \
  -d '{"text_a":"Developed REST APIs","text_b":"Built backend web services"}'
```

Analysis thresholds, persistence, authentication, billing, privacy, and
deployment are documented in [`docs/DECISIONS.md`](docs/DECISIONS.md),
[`docs/PRIVACY.md`](docs/PRIVACY.md), and [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

Run migrations with `cd api && python3 -m alembic upgrade head`. Run backend
tests with `python3 -m pytest api`. Frontend checks remain:

```bash
cd web
npm run lint
npm run typecheck
npm run build
```

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