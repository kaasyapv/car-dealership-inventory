# 1. SQLite through Node's built-in `node:sqlite`

**Status:** accepted

**Context.** The brief needs a real, persistent database (in-memory is explicitly not enough) and an easy local setup for a reviewer.

**Decision.** SQLite stored in a file, accessed with Node's built-in `node:sqlite` (Node 22.5+). No ORM.

**Why.** Zero install for the reviewer (no Postgres server, no native module that must compile), real SQL constraints (`CHECK`, `UNIQUE`, foreign keys) enforced by the database rather than only by app code, and transactions are available for the stock logic. The driver is synchronous, which keeps the code simple and makes each request's read-modify-write naturally serial within one process.

**Consequences.** One writer process. Fine for a single dealership; moving to Postgres means re-implementing the two repository classes behind the existing ports and nothing else. Tests use `:memory:` for speed; the running app always uses a file.
