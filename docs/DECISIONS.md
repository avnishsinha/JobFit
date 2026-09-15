# Engineering Decisions

## Phase 1: Keep the application boundary server-side

The Next.js page calls FastAPI from a server component using `BACKEND_URL`.
This is the smallest working frontend-to-backend integration and avoids
client-side exposure of backend configuration or a CORS policy before the
product needs browser API calls.

## Phase 1: Use a typed health contract

The API returns a small Pydantic response model, and the frontend validates
the JSON shape before rendering a connected state. This establishes explicit
contracts without introducing a broader API schema system prematurely.

## Phase 2: Keep embeddings inside the API process

Sentence Transformers runs behind an internal embedding service in the
FastAPI application. A cached dependency constructs the service once per
process and reuses its model across requests. This satisfies the current
scale and deployment needs without introducing an ML microservice.

## Phase 2: Normalize embeddings before cosine similarity

The service asks Sentence Transformers for normalized embeddings and computes
cosine similarity with an explicit vector helper. Normalization makes the
calculation simple and keeps the comparison behavior deterministic for the
same model and inputs.

## Phase 2: Avoid product match thresholds

The comparison endpoint returns only a similarity value and model metadata.
It does not label text as a match or derive a JobFit score; those decisions
belong to the Phase 3 analysis engine.
