# Production Runbook

## Recommended topology

Run the Next.js frontend and FastAPI backend as separate services. Use a
managed PostgreSQL instance for the API and keep the Sentence Transformers
model in the backend process. A reverse proxy or platform ingress should
terminate TLS and route `/` to the frontend and `/api` (or the configured
API hostname) to FastAPI.

Docker is intentionally not included yet: the current application is
deployable with native Python and Node buildpacks, and there is not enough
service complexity to justify another local/runtime abstraction.

## Deployment sequence

1. Create a managed PostgreSQL database and record its private connection URL.
2. Configure all variables listed in `.env.example`.
3. Run `cd api && python -m alembic upgrade head`.
4. Build the frontend with `npm ci && npm run build`.
5. Start FastAPI with `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
6. Configure Stripe's webhook endpoint as `/billing/webhook` for subscription
   events and set the signing secret.
7. Configure the frontend origin and verify `/ready` before accepting traffic.

## Backups and recovery

Enable automated encrypted backups and point-in-time recovery in the managed
PostgreSQL provider. Test restoring a recent backup into a separate database
before a production launch. Resume text is sensitive data; restrict database
access and retention to the minimum required period.

## Operational checks

- `GET /health` confirms the process is serving.
- `GET /ready` confirms database connectivity.
- Monitor 5xx rates, latency for `/analyses`, upload rejection rates, and
  Stripe webhook failures.
- Never log resume content, passwords, cookies, authorization headers, or
  full job descriptions.
