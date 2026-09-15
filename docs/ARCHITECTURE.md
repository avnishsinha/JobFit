# Architecture

## Phase 2 boundary

JobFit currently consists of two intentionally simple applications:

- `web/`: a Next.js App Router frontend using TypeScript and Tailwind CSS.
- `api/`: a FastAPI backend with typed health and semantic comparison
  endpoints.

The frontend server calls the backend using the server-only `BACKEND_URL`
environment variable. This keeps the initial integration private to the
server boundary and avoids exposing backend configuration to browser code.
The page renders an explicit connected or unavailable state.

The backend keeps semantic ML inference inside the FastAPI process. The
embedding service lazily loads `sentence-transformers/all-MiniLM-L6-v2` once
through a process-local cached dependency, then reuses that model for later
requests. There is no database, authentication, queue, or separate ML
service.

## Semantic comparison API

`POST /compare` accepts two non-empty text strings and returns a cosine
similarity score and the model identifier. The endpoint intentionally does
not classify results or apply product thresholds; those belong to Phase 3.

## Local runtime

Run the API on port 8000 and the web application on port 3000. The default
backend URL is `http://127.0.0.1:8000`; deployments can override it with
`BACKEND_URL`. The first semantic comparison downloads the configured model
from Hugging Face if it is not already cached locally.
