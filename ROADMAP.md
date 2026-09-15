# JobFit Engineering Roadmap

This roadmap controls implementation order.

Each phase should be completed, reviewed, and working before the next phase
begins.

---

# Phase 1 — Foundation

Goal:

Establish a clean full-stack application boundary.

Build:

- Next.js frontend under web/
- FastAPI backend under api/
- backend GET /health endpoint
- frontend-to-backend health communication
- environment configuration
- basic backend tests
- frontend linting
- frontend type checking
- production frontend build
- root development documentation
- docs/ARCHITECTURE.md
- docs/DECISIONS.md

Do NOT add:

- Hugging Face
- ML libraries
- PostgreSQL
- authentication
- resume upload
- payments
- Docker
- job analysis

Success condition:

A developer can run the frontend and backend locally and the frontend can
successfully communicate with the backend.

---

# Phase 2 — Semantic ML Foundation

Goal:

Prove that JobFit can perform semantic comparison using Hugging Face.

Build:

- Sentence Transformers integration
- model loading lifecycle
- embedding service abstraction
- cosine similarity calculation
- typed comparison API endpoint
- tests for deterministic similarity behavior
- model metadata in API response where appropriate

Input:

Two text strings.

Output:

A structured semantic comparison result.

No resume parsing yet.

Do NOT add:

- database
- authentication
- payments
- PDF uploads

Success condition:

The backend can compare semantically related and unrelated text through a
tested API.

---

# Phase 3 — JobFit Analysis Engine

Goal:

Turn semantic similarity into the core product capability.

Build:

- resume-text input
- job-description input
- initial job requirement extraction
- resume evidence segmentation
- requirement-to-evidence comparison
- classifications:
  - Strong Match
  - Partial Match
  - No Evidence
- overall compatibility calculation
- explainable structured result
- scoring configuration/version
- comprehensive tests

Use plain text input during this phase.

Do NOT add PDF upload solely to complete this phase.

Success condition:

Given resume text and a job description, the backend returns a useful,
repeatable, explainable JobFit analysis.

---

# Phase 4 — Product Experience

Goal:

Turn the analysis engine into a polished usable web product.

Build:

- JobFit landing experience
- analyzer page
- resume-text input
- job-description input
- analysis submission
- loading UX
- failure UX
- results UI
- requirement-level match cards
- evidence display
- overall compatibility presentation
- mobile responsiveness
- accessibility review

Still no database required.

Success condition:

A real user can visit the web application, submit their information, and
understand the analysis without using API tools.

---

# Phase 5 — Persistence

Goal:

Make JobFit a persistent application.

Introduce:

- PostgreSQL
- migration tooling
- database configuration

Initial entities:

- users or temporary ownership model as appropriate for upcoming auth
- resumes
- jobs
- analyses
- analysis requirements

Exact schema should be designed based on the working Phase 3/4 product,
not guessed prematurely.

Build:

- save analyses
- retrieve analyses
- persistent job records
- persistent resume records
- data deletion

Success condition:

Product data survives application restarts and uses migrations for schema
evolution.

---

# Phase 6 — Accounts & Private Workspace

Goal:

Turn the application into a multi-user SaaS.

Build:

- sign up
- sign in
- sign out
- protected application routes
- server-side authorization
- dashboard
- saved analyses
- saved jobs
- resume management
- PDF resume upload
- secure file validation
- text extraction
- deletion workflow

Every user-owned resource must be checked against the authenticated user.

Success condition:

Two different users cannot access each other's data.

---

# Phase 7 — Paid Product

Goal:

Introduce real monetization.

Build:

- Free entitlement
- Pro entitlement
- analysis usage limits
- subscription checkout
- server-side subscription verification
- webhook handling
- idempotency
- billing/customer management experience

Exact provider and pricing should be selected when this phase begins.

Success condition:

A real user can subscribe and backend functionality changes according to
verified entitlement state.

---

# Phase 8 — Production

Goal:

Operate JobFit as a reliable public product.

Build/configure as justified:

- production frontend deployment
- production backend deployment
- production PostgreSQL
- domain configuration
- CI
- automated tests
- deployment workflow
- structured production logging
- monitoring
- error tracking
- rate limiting
- abuse protection
- backups
- privacy documentation
- terms
- final security review

Docker may be introduced if it materially improves deployment or local
reproducibility.

Success condition:

JobFit is accessible publicly and can accept real users.

---

# Phase 9 — Product Expansion

Only after real-world feedback.

Candidates:

- multi-job comparison
- multiple resume variants
- improved requirement extraction
- model evaluation dataset
- scoring calibration
- analysis quality metrics
- recruiter-facing workflows
- additional subscription tiers

Features should be prioritized from evidence, not merely because they are
technically interesting.