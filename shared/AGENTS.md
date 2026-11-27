# AGENTS.md — shared

Resources shared across platforms: `design/` (design tokens), `schemas/` (contracts between apps, JSON Schema) and `fixtures/` (examples and test vectors). General rules in the root [`AGENTS.md`](../AGENTS.md).

- **Validate:** `scripts/verify.sh contracts` (well-formed JSON, plus `npm run contracts:check` when you add a schema validator). Fixtures also affect `backend`: `scripts/verify.sh` (`auto` mode) works it out for you.
- **An incompatible contract change** bumps the schema version; a compatible one (an optional field) does not. Every new message type has at least one valid example in `fixtures/` and, when it applies, an invalid one in `fixtures/invalid/` with its `reason`. Document the change in [`ARCHITECTURE.md`](../docs/architecture/ARCHITECTURE.md).
- **`design/tokens.json` is the source** of the tokens: `packages/ui/src/tokens.css` is generated with `npm run tokens` (never edited by hand; a hook prevents it).

## Code Review Rules

They add to the root ones. Mark as severe (P0/P1):

- **An incompatible contract change without bumping the version:** removing, renaming or changing the type of a field, or making an optional one required. Already-stored data must stay valid.
- **A new schema rule without its example:** every new type or variant has a valid fixture, and every new rule an invalid one with its `reason`.
- **Amounts that are not integers** in minor units, or enums duplicated instead of reused.
- **A contract change not documented** in the architecture document.
- **Tokens:** changing `design/tokens.json` without regenerating `packages/ui/src/tokens.css` (`npm run tokens`).
