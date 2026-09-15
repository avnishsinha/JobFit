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

