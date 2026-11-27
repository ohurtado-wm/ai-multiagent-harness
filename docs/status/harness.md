# Status: harness

Real status of the agent harness, newest first. How it works: [`HARNESS.md`](../../HARNESS.md).

## Presentation slides

- [`docs/site/index.html`](../site/index.html): a self-contained slide deck (15 slides, 1600×900 scaled to the screen) that summarizes `HARNESS.md` with diagrams, in the brand palette. Keyboard navigation, full screen and print to PDF; no external dependencies. Also served by the `harness-slides` entry in `.claude/launch.json`.
- Checked on desktop at 1600×900; mobile layouts are out of scope.

## Hardening after the review against the official docs

Plan: [`PLAN_HARNESS_REVIEW_HARDENING.md`](../plans/harness/PLAN_HARNESS_REVIEW_HARDENING.md) (issue #1).

- Folder `CLAUDE.md` files (`@AGENTS.md`) in `apps/web`, `apps/mobile`, `backend`, `packages/ui` and `shared`.
- Safety hooks registered with `onFailure: "block"` and `timeout: 30`.
- `permissions.deny` blocks pushes to `main`/`dev`, forced pushes, `--all` and `--mirror`.
- `subagentPromptCacheTtl: "1h"` for subagents and teammates.
- The session hook states facts instead of orders.

**Not verified:** the behavior of `onFailure`, the deny rules and the cache setting inside a live Claude Code session (they need Claude Code v2.1.295+ opened on this repository).

## Initial import

- Rules for agents (`AGENTS.md`, imported by `CLAUDE.md`) and one `AGENTS.md` per main folder with its «Code Review Rules».
- Hooks in `.claude/hooks/` (`git-guard`, `team-guard`, `generated-guard`, `task-gate`, `session-context`), each with its unit tests.
- Skills in `.claude/skills/`: `feature-plan`, `new-branch`, `close-increment`, `onboarding`, `orchestrate-team`, `resolve-issues`, `verify-ui`, `reference-parity`.
- Subagents in `.claude/agents/`: team roles (`documenter`, `coder`, `qa`, `pr-reviewer`) and read-only reviewers (`db-security-reviewer`, `contract-reviewer`, `reference-explorer`).
- Scripts: `verify.sh` (validation by areas), `plan-status.mjs` (plan tree and status), `pr-check-plan.mjs` (rule 4 in CI), `check-links.mjs`, `check-json.mjs`, `build-tokens.mjs`.
- GitHub Issues integration: an issue per plan (epics and sub-issues), `finding` issues for deferred findings, `Closes #<n>` in PRs, review threads answered and resolved, and the `ai-queue`/`ai-merge`/`ai-escalated` work queue; labels created by `scripts/setup-github-labels.sh`; guide in [`GITHUB_ISSUES.md`](../guides/GITHUB_ISSUES.md).
- GitHub: CI by areas, plan check, PR template, `finding` issue template and `CODEOWNERS`.

**Not verified yet:** agent teams and the issue loop against a real GitHub repository (they need the repo, the labels and a Codex session).
