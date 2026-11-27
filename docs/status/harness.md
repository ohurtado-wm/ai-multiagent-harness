# Status: harness

Real status of the agent harness, newest first. How it works: [`HARNESS.md`](../../HARNESS.md).

## Initial import

- Rules for agents (`AGENTS.md`, imported by `CLAUDE.md`) and one `AGENTS.md` per main folder with its «Code Review Rules».
- Hooks in `.claude/hooks/` (`git-guard`, `team-guard`, `generated-guard`, `task-gate`, `session-context`), each with its unit tests.
- Skills in `.claude/skills/`: `feature-plan`, `new-branch`, `close-increment`, `onboarding`, `orchestrate-team`, `resolve-issues`, `verify-ui`, `reference-parity`.
- Subagents in `.claude/agents/`: team roles (`documenter`, `coder`, `qa`, `pr-reviewer`) and read-only reviewers (`db-security-reviewer`, `contract-reviewer`, `reference-explorer`).
- Scripts: `verify.sh` (validation by areas), `plan-status.mjs` (plan tree and status), `pr-check-plan.mjs` (rule 4 in CI), `check-links.mjs`, `check-json.mjs`, `build-tokens.mjs`.
- GitHub Issues integration: an issue per plan (epics and sub-issues), `finding` issues for deferred findings, `Closes #<n>` in PRs, review threads answered and resolved, and the `ai-queue`/`ai-merge`/`ai-escalated` work queue; labels created by `scripts/setup-github-labels.sh`; guide in [`GITHUB_ISSUES.md`](../guides/GITHUB_ISSUES.md).
- GitHub: CI by areas, plan check, PR template, `finding` issue template and `CODEOWNERS`.

**Not verified yet:** agent teams and the issue loop against a real GitHub repository (they need the repo, the labels and a Codex session).
