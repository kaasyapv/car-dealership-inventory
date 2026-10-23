# 6. Testing strategy

**Status:** accepted

- **Red, green, refactor in the git history.** `test(red)` commits add failing specs; the next `feat`/`fix` makes them pass; `refactor` changes structure with the suite unchanged.
- **Pyramid.** Service unit tests with fakes (fast, many) -> API tests with Supertest against a real SQLite (every route, every status code) -> component tests with Testing Library (behaviour by accessible role/name, never by CSS class) -> a handful of Playwright journeys in real Chrome against the real API.
- **Contract test.** Every operation in the OpenAPI document must exist in the running app.
- **What is not mocked.** The HTTP tests use the real database and real bcrypt/JWT; only the service tests use fakes.
- **Honesty about gaps.** Coverage numbers are in the README; the uncovered lines are mostly defensive branches in the UI (toast dismissal, load-more failure).
