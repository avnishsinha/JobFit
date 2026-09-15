# AGENTS.md

## Project

This repository contains JobFit, a production-oriented full-stack AI SaaS
application.

Read these files before performing substantial work:

1. PROJECT_SPEC.md
2. ROADMAP.md
3. relevant documentation under docs/

PROJECT_SPEC.md defines what the product is.

ROADMAP.md defines when functionality should be introduced.

Do not implement future phases unless explicitly requested.

---

# Primary Rule

Make the smallest correct change that satisfies the requested task.

Do not add features simply because they seem useful.

Do not add infrastructure simply because it is common in production
systems.

Complexity must be justified by a current requirement.

---

# Before Coding

Before implementing a non-trivial task:

1. Inspect the repository.
2. Read the relevant project documentation.
3. Understand the existing architecture.
4. Identify the requested roadmap phase.
5. Check whether the proposed work belongs to that phase.
6. Produce a short implementation plan.
7. Then implement.

Do not blindly scaffold over existing code.

---

# Scope Discipline

If asked to implement Phase N:

- implement Phase N only
- do not begin Phase N+1
- do not install dependencies needed only by later phases
- do not create placeholder implementations for future features unless
  explicitly required

If something from a future phase appears necessary, explain why before
introducing it.

---

# Architecture

Initial architecture:

web/
    Next.js frontend

api/
    FastAPI backend

The backend will initially contain ML functionality internally.

Do not introduce:

- separate ML services
- Redis
- queues
- Kubernetes
- additional databases
- event buses
- microservices

unless an explicit later requirement justifies them.

---

# Frontend

Use:

- Next.js
- React
- TypeScript
- Tailwind CSS

Requirements:

- strict TypeScript where practical
- avoid `any`
- focused components
- accessible semantic HTML
- responsive layouts
- explicit loading states
- explicit empty states
- explicit error states
- business logic outside presentation components
- server-side functionality where appropriate

Do not expose backend secrets to the browser.

Environment variables exposed to the client must be intentionally public.

---

# Backend

Use:

- Python
- FastAPI
- Pydantic

Requirements:

- type hints
- validated input
- validated responses where practical
- thin route handlers
- service-layer business logic
- consistent error responses
- clear module boundaries
- tests for important behavior

Do not put the whole backend inside one file once responsibilities begin
to grow.

Do not catch exceptions merely to hide them.

---

# AI / ML

The ML layer must remain modular.

Model loading must not occur independently for every request if it can be
loaded once safely.

ML inference belongs server-side.

Initial embedding model:

sentence-transformers/all-MiniLM-L6-v2

Do not change the model without documenting the reason.

Do not introduce an LLM merely because a feature involves text.

Prefer deterministic logic when deterministic logic solves the problem.

Never invent candidate experience.

Never represent semantic similarity as certainty.

Never claim JobFit predicts whether a person will:

- get hired
- receive an interview
- pass an ATS

Thresholds must be configurable and documented.

Important scoring behavior should have tests.

---

# Data & Privacy

Treat resume content as sensitive personal information.

Do not log full:

- resumes
- job descriptions where avoidable
- authentication tokens
- passwords
- payment information

User-owned resources must eventually be authorized server-side.

Never trust a resource ID alone as evidence that a user may access the
resource.

Collect and retain only data required by the product.

---

# Security

Never commit:

- .env files containing secrets
- API keys
- passwords
- tokens
- database credentials
- payment secrets
- private keys

Use environment variables.

Maintain an example environment file containing names/placeholders only.

Validate external input.

Do not expose stack traces or sensitive internal data to end users in
production.

---

# Database

When the roadmap introduces PostgreSQL:

- use migrations
- use primary keys
- use foreign keys
- use constraints
- add indexes based on actual access patterns
- enforce ownership relationships

Do not manually modify production schemas.

Do not introduce PostgreSQL before its roadmap phase.

---

# Payments

Do not implement payments until the roadmap explicitly reaches the
payments phase.

When payments are introduced:

- verify payment state server-side
- enforce entitlements server-side
- make webhook processing idempotent
- never trust frontend subscription state

---

# Dependencies

Before adding a dependency:

1. Determine whether the existing stack already solves the problem.
2. Prefer actively maintained packages.
3. Avoid duplicate functionality.
4. Avoid dependencies for trivial utilities.
5. Explain significant additions.

Do not perform broad dependency upgrades during unrelated work.

---

# Testing

Features should be testable.

Before declaring work complete, run the checks relevant to the changed
code.

Examples:

Backend:
- tests
- formatting/linting if configured
- type checks if configured

Frontend:
- lint
- type checking
- tests if configured
- production build

Do not claim a command passed unless it was actually executed.

Do not remove or weaken tests merely to make a build pass.

Bug fixes should include regression coverage where practical.

---

# Git

Keep changes focused.

Do not:

- force push
- rewrite history
- delete branches
- perform destructive Git commands
- push changes
- merge changes

unless explicitly requested.

Do not commit generated artifacts that belong in .gitignore.

Commit messages should describe the engineering change, not the prompt
used to generate it.

---

# Documentation

Documentation must reflect the actual implementation.

Update documentation when changing:

- architecture
- setup
- environment variables
- API contracts
- scoring behavior
- important dependencies
- developer workflow

Record significant architectural decisions in docs/DECISIONS.md once that
file exists.

Do not document imaginary future infrastructure as if it currently
exists.

---

# Code Quality

Prefer readable code over clever code.

Avoid:

- giant functions
- giant components
- duplicated logic
- unexplained constants
- unnecessary abstractions
- speculative frameworks
- dead code
- commented-out implementations

Comments should explain why when the reason is not obvious.

Names should explain what code represents.

---

# AI Coding Behavior

Do not optimize for the largest possible code change.

Do not rewrite working modules solely to make them look cleaner.

Do not silently change product behavior.

Do not fake integrations.

Do not create fake API responses and represent them as completed
functionality.

Do not mark TODO functionality as complete.

If blocked, explain the blocker clearly.

If uncertain about an architectural decision, prefer the simpler option
that is reversible.

---

# Definition of Done

A task is complete only when:

1. requested scope is implemented
2. implementation matches PROJECT_SPEC.md
3. implementation stays within ROADMAP.md
4. relevant tests/checks have actually been executed
5. errors are handled appropriately
6. security implications were considered
7. documentation is accurate
8. no secrets were introduced
9. no unrelated features were added

At completion report:

- summary of implementation
- files created
- files modified
- dependencies added
- tests/checks executed and results
- known limitations
- recommended next step

Do not claim work is production-ready merely because it compiles.