# Status: harness

Real status of the agent harness, newest first. How it works: [`HARNESS.md`](../../HARNESS.md).

## Interactive agent model selection

Plan: [PLAN_CONFIGURE_AGENTS_PICKER.md](../plans/harness/PLAN_CONFIGURE_AGENTS_PICKER.md) (issue #11).

- [Configure agent models](../guides/CONFIGURE_AGENTS.md) asks whether to configure a single role or the whole team. Each role gets its own model choice, including a custom ID, and defaults to high reasoning effort when supported.
- The same setup command reads the catalog and current role settings, then validates and saves the selected models in one batch.

## Claude Code or Codex as team coordinator

Plan: [PLAN_DUAL_ORCHESTRATOR.md](../plans/harness/PLAN_DUAL_ORCHESTRATOR.md) (issue #9).

- Both clients use the [team workflow](../guides/TEAM_WORKFLOW.md) for plans, GitHub issues and PRs. A second client can resume from the plan, Git and the PR.
- [Configure agent models](../guides/CONFIGURE_AGENTS.md) edits native coordinator and role settings. Claude can use its configured Codex writer or implement directly.
- Codex uses the shared Git and whole-file generated guards for supported local calls. The scheduled issue loop runs in Claude Code.
- The [site](../site/index.html) and [presentation](../site/presentation.html) have a shared Claude Code or Codex selector. Each view shows its coordinator example, commands and model configuration in Adopt.

## Setup script for repositories created from the template

Plan: [`PLAN_SETUP_NEW_REPO.md`](../plans/harness/PLAN_SETUP_NEW_REPO.md) (issue #6).

- `scripts/setup-new-repo.sh`: points `CODEOWNERS` to the new owner (`scripts/set-codeowners.mjs`, with tests), makes `dev` the default branch, creates the labels and prints the next steps; `--dry-run` and `--codeowner`. It never commits.
- README quick start, the site's «Adopt» block and the deck use it.

## Presentation site

- [`docs/site/index.html`](../site/index.html): landing page that explains the whole harness (`HARNESS.md`), including what it takes from Claude Code, with animated diagrams, a tabbed explorer of the building blocks and links to the deck.
- [`docs/site/presentation.html`](../site/presentation.html): a self-contained slide deck (17 slides, 1600×900 scaled to the screen) that summarizes `HARNESS.md` with diagrams, in the brand palette. Keyboard navigation, full screen and print to PDF; no external dependencies. Both pages are served by the `harness-site` entry in `.claude/launch.json` (port 3400).
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
