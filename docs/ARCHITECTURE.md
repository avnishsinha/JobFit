# Architecture

## Current boundary

JobFit consists of two applications:

- `web/`: Next.js App Router frontend using TypeScript and Tailwind CSS.
- `api/`: FastAPI backend containing authentication, persistence, billing,
  PDF extraction, analysis, and the Sentence Transformers embedding service.

PostgreSQL is the production database. SQLAlchemy models are managed through
Alembic migrations. SQLite is used only as a lightweight development/test
fallback when `DATABASE_URL` is not supplied. User-owned rows contain a
`user_id` foreign key and every repository query includes that owner scope.

## Authentication and privacy

The API uses Argon2 password hashing and signed, HttpOnly JWT session cookies.
The browser never receives a password hash or payment secret. Resume uploads
are validated as PDFs, size-limited, parsed server-side, and their extracted
text is stored only in the owner's database rows. Uploaded PDF bytes and
embeddings are not persisted.

## Analysis

`POST /analyses` loads an owner's resume and job, enforces usage entitlement,
then reuses the Phase 2 cached Sentence Transformers service and Phase 3
analysis engine. Results persist model/scoring metadata and requirement-level
evidence. Analysis routes never accept IDs without checking the authenticated
owner.

## Billing

Stripe Checkout creates Pro subscriptions. Stripe-signed webhooks update the
server-side subscription and plan state. Analysis limits are enforced from
database state, never from frontend state. Webhook event IDs are unique for
idempotent processing.

## Production operation

The frontend and backend are deployed as separate services with managed
PostgreSQL. `/health` checks process availability and `/ready` checks database
availability. CI runs backend tests/migrations and frontend lint, typecheck,
and build. See [`RUNBOOK.md`](RUNBOOK.md) for deployment and recovery steps.
