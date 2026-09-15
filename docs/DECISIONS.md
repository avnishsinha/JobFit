# Engineering Decisions

## Phase 1: Keep the application boundary server-side

The initial health page called FastAPI from a server component using
`BACKEND_URL`. This kept the first integration private to the server boundary
before browser API calls were needed.

## Phase 1: Use a typed health contract

The API returns a small Pydantic response model. This establishes an explicit
contract without introducing a broader API schema system prematurely.

## Phase 2: Keep embeddings inside the API process

Sentence Transformers runs behind an internal embedding service in the
FastAPI application. A cached dependency constructs the service once per
process and reuses its model across requests. This satisfies the current
scale and deployment needs without introducing an ML microservice.

## Phase 2: Normalize embeddings before cosine similarity

The service asks Sentence Transformers for normalized embeddings and computes
cosine similarity with an explicit vector helper. Normalization makes the
calculation simple and keeps comparison behavior deterministic for the same
model and inputs.

## Phase 3: Use deterministic requirement extraction

The analysis engine treats explicit bullet lines as requirements. When no
bullets are present, it splits non-empty lines into sentences and keeps
sentences containing requirement or action cues such as `experience`,
`ability`, `skill`, `develop`, or `design`. Requirements are normalized,
deduplicated case-insensitively, and never generated from outside the input.

## Phase 3: Compare requirements against resume evidence units

Resume text is split into non-empty lines within paragraphs, with common
bullet prefixes removed. Every extracted requirement is compared with every
evidence unit through the existing embedding service. The highest similarity
is the requirement's score and its corresponding supplied text is the only
possible supporting evidence.

## Phase 3: Classification and overall score

The versioned default scoring configuration is `phase-3-v1`:

- Strong Match: similarity >= 0.70
- Partial Match: similarity >= 0.45 and < 0.70
- No Evidence: similarity < 0.45

Overall compatibility is the average of requirement classification points:
Strong Match = 1.0, Partial Match = 0.5, and No Evidence = 0.0, expressed as
a percentage. This is an alignment summary, not a hiring, interview, or ATS
probability.

## Phase 4: Keep scoring on the backend

The browser calls the real `/analyze` endpoint and renders its typed result.
It does not reimplement extraction, embeddings, thresholds, or scoring.
Local CORS is explicit so the browser can communicate with the API without
introducing a proxy or a separate service.
