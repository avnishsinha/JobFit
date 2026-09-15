# JobFit — Product Specification

## Product

JobFit is a production web application that helps job seekers understand
how well their actual resume matches a specific job.

A user provides a resume and a job description.

JobFit analyzes both using semantic NLP models and returns an explainable
compatibility analysis.

JobFit is not intended to be a generic keyword-based ATS score generator
and must not claim to predict whether someone will be hired.

---

## Product Goal

Help a user answer:

- How well does my experience align with this job?
- Which requirements do I strongly match?
- Which requirements do I partially match?
- Which requirements appear unsupported by my resume?
- What evidence from my resume supports each match?
- Which jobs are the strongest matches for my current experience?

The application must never encourage users to fabricate experience.

---

## Engineering Goal

JobFit should become a real deployed and paid SaaS product.

The project should demonstrate:

- production frontend engineering
- backend API development
- Python services
- relational database design
- authentication and authorization
- machine-learning inference
- Hugging Face models
- semantic embeddings
- deterministic scoring
- explainable AI results
- file processing
- subscriptions and usage limits
- testing
- security
- CI/CD
- observability
- production deployment

---

## Target User

Primary user:

A professional actively applying for jobs.

Typical workflow:

1. Create an account.
2. Upload a resume.
3. Add a job description.
4. Run an analysis.
5. Review overall compatibility.
6. Review requirement-level matches.
7. Inspect evidence from their resume.
8. Identify genuine experience gaps.
9. Save the analysis.
10. Compare the resume against other jobs.

---

# Core Product

## Resume

Eventually users must be able to:

- upload PDF resumes
- extract resume text
- save multiple resumes
- select a resume for analysis
- delete resumes and associated data

Resume files contain personal information and must be treated as sensitive.

---

## Job

Users must eventually be able to provide:

- job title
- company
- full job description
- optional job URL

Jobs can be saved and analyzed later.

---

## Analysis

The analysis pipeline should eventually:

1. Extract useful resume content.
2. Parse the job description.
3. identify individual job requirements.
4. Generate semantic representations using a Hugging Face model.
5. Compare each requirement against relevant resume evidence.
6. Calculate semantic similarity.
7. Classify each requirement.
8. Calculate an explainable overall compatibility score.
9. Return supporting resume evidence.

Initial classifications:

- Strong Match
- Partial Match
- No Evidence

"No Evidence" is preferred over language implying the candidate definitely
does not possess a skill. JobFit only knows what is present in the supplied
resume.

---

## Explainability

Every analyzed requirement should eventually include:

- requirement
- classification
- similarity value
- strongest supporting resume evidence
- human-readable explanation where useful

Example:

Requirement:
Experience developing REST APIs

Classification:
Strong Match

Resume evidence:
Developed backend REST APIs using Java and PostgreSQL.

Semantic similarity:
0.87

---

# Machine Learning

## Hugging Face

Initial model:

sentence-transformers/all-MiniLM-L6-v2

Initial implementation:

- Python
- Sentence Transformers
- Hugging Face ecosystem
- cosine similarity

Do not train or fine-tune models for the initial product.

The model should initially run inside the Python backend.

Do NOT create a separate ML microservice unless real operational
requirements later justify one.

---

## ML Architecture

ML functionality must be isolated behind an internal service/module
interface.

Conceptually:

Frontend
    ↓
FastAPI
    ↓
Analysis Service
    ↓
Embedding Service
    ↓
Hugging Face / Sentence Transformers

This allows models to change without rewriting the product.

---

## Reproducibility

Analysis should be deterministic when given the same:

- resume content
- job description
- model
- model configuration
- scoring configuration

Persist or expose enough metadata to identify:

- model identifier
- scoring configuration/version
- analysis timestamp

---

## Scoring Rules

Do not invent arbitrary scores for UI purposes.

Overall compatibility must eventually be derived from requirement-level
analysis.

Semantic similarity must NOT be described as:

- hiring probability
- acceptance probability
- probability of passing an ATS
- probability of receiving an interview

Scoring methodology must be documented.

---

# Product Features

## MVP

The MVP ultimately needs:

- landing page
- authentication
- resume upload
- job creation
- AI analysis
- explainable results
- saved analyses
- dashboard
- user data isolation

However, these features should be built incrementally according to
ROADMAP.md rather than all at once.

---

## Job Comparison

After the core analysis experience works, users should be able to compare
one resume against multiple saved jobs.

Example:

Backend Engineer — 91
Full Stack Engineer — 84
Android Engineer — 78

Comparison should reuse existing compatible analyses rather than
unnecessarily rerunning inference.

---

# Monetization

JobFit should eventually be a paid product.

Potential model:

## Free

- limited analyses per month
- core analysis results

## Pro

- larger analysis allowance
- analysis history
- multiple resumes
- job comparison
- richer insights

Exact pricing is a business decision and is NOT fixed by this document.

Subscription entitlements must be enforced by the backend.

Frontend state must never be considered proof of payment or entitlement.

Payments are not part of early development phases.

---

# Technology

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

## Backend

- Python
- FastAPI
- Pydantic

## Machine Learning

- Hugging Face
- Sentence Transformers
- PyTorch where required

## Database

- PostgreSQL

Database implementation happens only when required by the roadmap.

## Development

- Git
- GitHub

Additional infrastructure should only be introduced when justified.

---

# API Principles

Frontend and backend communicate through explicit APIs.

Core business logic must not live in React components.

ML inference happens server-side.

External input must be validated.

Request and response contracts should be typed and documented.

Errors should use consistent structured responses.

---

# Privacy & Security

Resumes contain sensitive personal data.

Production implementation must:

- avoid logging complete resume contents
- avoid exposing resume contents in error messages
- validate uploaded files
- restrict file types
- restrict upload size
- authorize access to every user-owned resource
- support deletion
- keep credentials outside source control
- minimize collection and retention of unnecessary personal information

Never commit:

- API keys
- passwords
- database credentials
- private tokens
- payment secrets
- production environment files

---

# Product UX Principles

The product should feel:

- trustworthy
- fast
- professional
- understandable
- evidence-based

Avoid:

- fake precision
- misleading AI claims
- excessive animations
- AI-generated visual clutter
- unnecessary dashboards
- deceptive urgency
- fabricated testimonials
- dark patterns

The results themselves should be the primary value.

---

# Engineering Principles

Prefer:

- simple architecture
- explicit contracts
- typed code
- small modules
- tests around important logic
- clear error handling
- secure defaults
- documented decisions
- incremental implementation

Avoid:

- premature microservices
- unnecessary abstractions
- unnecessary dependencies
- architecture added solely to make the project appear sophisticated
- giant files
- duplicated business logic

---

# Non-Goals for Initial Development

Do not initially build:

- model fine-tuning
- custom model training
- mobile application
- browser extension
- automated job applications
- recruiter marketplace
- cover-letter generator
- interview coach
- autonomous AI agents
- large-scale job scraping
- Kubernetes
- Redis
- distributed queues
- dedicated ML microservice
- complex RAG architecture

These may only be evaluated later if actual product requirements justify
them.

---

# Product Principle

JobFit should do a small number of things extremely well.

Trustworthy analysis is more valuable than a large collection of shallow
AI features.