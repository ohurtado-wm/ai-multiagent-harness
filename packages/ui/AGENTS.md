# AGENTS.md — packages/ui

Shared UI components for the web apps. General rules in the root [`AGENTS.md`](../../AGENTS.md).

- **Validate:** `scripts/verify.sh web`.
- `src/tokens.css` is **generated** from `shared/design/tokens.json` with `npm run tokens` (`npm run tokens:check` verifies it is up to date). Do not edit it by hand: the `generated-guard` hook blocks it.
- Components use the tokens (`var(--color-primary)`), never hard-coded colors or spacing.

## Code Review Rules

They add to the root ones. Mark as severe (P0/P1):

- **`src/tokens.css` edited by hand** without changing `shared/design/tokens.json`.
- **A component that breaks accessibility** (no accessible name, keyboard trap, color pair without enough contrast).
