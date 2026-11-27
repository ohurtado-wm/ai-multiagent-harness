# AGENTS.md — backend

API, database migrations (`migrations/`) and their tests (`tests/`). General rules in the root [`AGENTS.md`](../AGENTS.md).

- **Validate:** `scripts/verify.sh backend` (the `test` script of `backend/package.json`, or the database test runner you plug into `area_backend`). If the local database has data from previous integration runs and unrelated tests fail, **do not reset it on your own**: it is where the owner keeps their test data. Ask first; to apply a new migration without wiping anything, apply pending migrations. Subagents cannot reset it (`team-guard`).
- **A new migration** is a new file with a timestamp; never edit an already-applied migration. Every table has explicit grants.
- **Security:** access control on every table (row-level security or equivalent); privileged functions with a fixed `search_path`; every client access goes through functions that check role or membership on the server. Each new function has tests, including the denied path.
- **Lists:** list functions receive search, filters, a sort key from an allow list, offset and limit, and return `{rows, total}`.
- **Remote environments:** pushing migrations and deploying functions to a remote environment is the owner's decision; dry-run first and ask for permission.
- The shared contracts live in `shared/schemas/`; the protocol, in [`ARCHITECTURE.md`](../docs/architecture/ARCHITECTURE.md).

## Code Review Rules

They add to the root ones. Mark as severe (P0/P1):

- **A new table without protection:** without access policies, or with direct client access the design does not ask for; `grant all` or grants to public roles without a reason.
- **A privileged function** without a fixed `search_path`, with unqualified objects, or without revoking execute from public roles.
- **An exposed function without authorization inside:** it must check the caller and their role or membership before reading or writing, and fail closed. The tenant comes from the membership, never from a client parameter.
- **Dynamic SQL with client text:** the list sort comes from an allow list; search goes as a parameter; the limit is bounded.
- **An applied migration that is edited** (instead of a new migration), or a migration that deletes data without saying so.
- **A new function or policy without tests**, or without the denied path: another tenant, another role, no session.
- **Tests that seed a state the real flow does not produce:** the test passes and the function fails with real data. Seed with the application's functions or with rows of the same shape they leave.
