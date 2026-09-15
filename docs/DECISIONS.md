# Engineering Decisions

## Phase 2: Keep embeddings inside the API process

Sentence Transformers runs behind an internal embedding service in FastAPI.
A cached dependency constructs the service once per process and reuses its
model across requests. No ML microservice is needed for the current scale.

## Phase 3: Deterministic analysis

Explicit job-description bullets are requirements. Without bullets, lines are
split into sentences and filtered by requirement/action cues. Resume text is
split into non-empty evidence units. Every requirement is compared with every
unit through the existing embedding service, and only supplied resume text
can become supporting evidence.

The versioned defaults are `phase-3-v1`: Strong Match >= 0.70, Partial Match
>= 0.45, otherwise No Evidence. Overall compatibility averages Strong=1.0,
Partial=0.5, No Evidence=0.0 and is not a hiring, interview, or ATS
probability.

## Phase 5: Relational persistence

SQLAlchemy and Alembic were chosen because the product now has ownership,
foreign keys, deletion behavior, and historical analysis metadata that
benefit from relational constraints. We store resumes, jobs, analyses,
requirements, subscriptions, usage records, and webhook idempotency keys.
Embeddings and original PDF bytes are intentionally not stored.

## Phase 6: HttpOnly session cookies

First-party Argon2 password hashing plus signed JWT cookies provide a small
session boundary without exposing tokens to browser JavaScript. Every
user-owned query filters by the authenticated user's ID. Production requires
HTTPS so the cookie is marked Secure for HTTPS origins.

## Phase 7: Stripe billing

Stripe is the simplest established provider for Checkout, subscriptions,
customer portal, and signed webhooks. Price IDs and secrets remain
environment-driven. Free users receive five analyses per UTC calendar month;
active/trialing Pro users have no application-level monthly cap. The backend
is authoritative for entitlement state.

## Phase 8: Keep deployment infrastructure minimal

No Docker, Redis, queues, Kubernetes, or vector database is introduced.
Managed PostgreSQL plus separate frontend/backend services are sufficient.
CI, migrations, structured request logs, security headers, readiness checks,
upload limits, and a small process-local rate limiter address the current
operational risks without speculative infrastructure.
