# Architecture

## Phase 4 boundary

JobFit currently consists of two intentionally simple applications:

- `web/`: a Next.js App Router frontend using TypeScript and Tailwind CSS.
- `api/`: a FastAPI backend with typed health, semantic comparison, and
  JobFit analysis endpoints.

The analyzer is a client component that calls FastAPI's `/analyze` endpoint
using `NEXT_PUBLIC_BACKEND_URL`. FastAPI allows the local frontend origins
through a narrow CORS configuration. The frontend does not duplicate
extraction, embedding, threshold, or scoring logic.

The backend keeps semantic ML inference inside the FastAPI process. The
embedding service lazily loads `sentence-transformers/all-MiniLM-L6-v2` once
through a process-local cached dependency, then reuses that model for later
requests. There is no database, authentication, queue, or separate ML
service.

## Semantic comparison API

`POST /compare` accepts two non-empty text strings and returns a cosine
similarity score and the model identifier. The endpoint does not classify
results or apply product thresholds.

## JobFit analysis API

`POST /analyze` accepts plain-text `resume_text` and `job_description`.
The backend deterministically extracts requirements, segments the resume into
evidence units, compares every requirement with every evidence unit using the
cached embedding service, and returns the strongest evidence and
classification for each requirement.

The frontend presents the resulting score and explanations but does not
calculate them.

## Local runtime

Run the API on port 8000 and the web application on port 3000. The default
backend URL is `http://127.0.0.1:8000`; deployments can override it with
`BACKEND_URL` and `NEXT_PUBLIC_BACKEND_URL`. The first semantic comparison or
analysis downloads the configured model from Hugging Face if it is not already
cached locally.
