# Architecture

## Phase 1 boundary

JobFit currently consists of two intentionally simple applications:

- `web/`: a Next.js App Router frontend using TypeScript and Tailwind CSS.
- `api/`: a FastAPI backend with a typed `GET /health` endpoint.

The frontend server calls the backend using the server-only `BACKEND_URL`
environment variable. This keeps the initial integration private to the
server boundary and avoids exposing backend configuration to browser code.
The page renders an explicit connected or unavailable state.

There is no database, authentication, ML dependency, queue, or separate
service in Phase 1. Those concerns are introduced only by later roadmap
phases.

## Local runtime

Run the API on port 8000 and the web application on port 3000. The default
backend URL is `http://127.0.0.1:8000`; deployments can override it with
`BACKEND_URL`.

