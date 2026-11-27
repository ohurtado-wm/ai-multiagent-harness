# AGENTS.md

Instructions for AI agents working in this repository (Claude Code, Codex and others). This is the single source of truth: `CLAUDE.md` only imports it. The repository and review rules apply to every agent. The team and model-configuration skills have Claude Code and Codex entry points. Claude-specific tools such as `/onboarding` and `/loop` are identified where used. Each main folder has its own `AGENTS.md`, which adds to this one, and a one-line `CLAUDE.md` (`@AGENTS.md`) so Claude Code loads it in every version. A new folder with an `AGENTS.md` gets its `CLAUDE.md` too.

If you are going to **review a PR**, go straight to [Code Review Rules](#code-review-rules) at the end of this file and to the section with the same name in the `AGENTS.md` of each folder the PR changes.

How the harness works as a whole (for people, not agents): [`HARNESS.md`](HARNESS.md).

## First step (Claude Code)

On a new machine, or if tools or skills are missing, run `/onboarding` first (skill in `.claude/skills/onboarding/`). It checks and installs the required skills and the development environment.

Before making changes, read [`PROJECT_MAP.md`](PROJECT_MAP.md): the main paths of the monorepo and the validation commands. **Reading the project status is not mandatory** ([`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) and `docs/status/`): look at it only when you need to know what is done in an area, and if you state the status of something, confirm it in the code or in its plan. When the session starts, a hook gives you the branch, the open PR and the plans the branch touched.

## Project context

<!-- Replace this section with a short description of your product. Keep it to a few lines: agents read it on every session. -->

This is a monorepo for **the project under development**:

- `apps/web/` — web application.
- `apps/mobile/` — mobile application.
- `backend/` — API, database migrations and their tests.
- `packages/ui/` — shared UI components and generated design tokens.
- `shared/` — design tokens, schemas (contracts between apps) and fixtures shared across platforms.
- `docs/` — organized by type: `plans/` (one subfolder per product or theme; `harness/` for the harness itself), `status/` (real status per area), `guides/` and `architecture/`.

**Functional reference (optional):** if one app is the reference that the others port from (same screens, texts and rules), declare it here, for example `apps/web/`. The `reference-explorer` subagent and the `reference-parity` skill use it.

## Repository rules

Mandatory for every agent, with no exceptions, even if the user asks casually: in that case, remind them of the rule and propose the correct flow.

1. **Never commit directly to `main` or `dev`.** Always work on your own branch (`feature/...`, `fix/...`, `docs/...`, `chore/...`, etc.). If you are on `main` or `dev`, create a branch before committing.
2. **Never open a PR to `main`** from a work branch, and never merge or push to `main` (nor push to `dev`).
3. **PR flow: work branch → `dev` → `main`.** PRs from work branches are always opened against `dev` (with an explicit `--base dev`). Promoting `dev` to `main` is done by a person, never by an agent.
4. **Before implementing a feature, write a plan** in Markdown and save it in `docs/plans/` (in the subfolder of its product or theme), following the format of the existing plans: scope, tasks, tests and closing criteria. Do not start implementing without the written plan.

Rule 4 is checked by the `plan.yml` workflow on every PR (it warns, it does not block): if the PR changes code without adding or modifying a plan in `docs/plans/`, it asks for the plan or a `No plan: <reason>` line in the description. The PR template (`.github/pull_request_template.md`) has the checklist.

The Git and generated-file guards are registered in Claude Code and in trusted Codex projects for supported tool calls. GitHub branch protection covers pushes and merges from either client or a terminal when configured. If a hook blocks you, do what its message says; do not work around it. Personal preferences go in `.claude/settings.local.json` (not versioned); shared configuration goes in `.claude/settings.json`.

## Working rules

- When you finish an increment or change the architecture of the monorepo, update the area's file in `docs/status/` (and `PROJECT_MAP.md` if the path structure changes) and the plan header (`status`, `parent`, `previous`, `next`; format in the `feature-plan` skill); run `node scripts/plan-status.mjs` to regenerate `docs/status/plans.md`. To know what is in progress, what comes next or which plan another one hangs from, use `node scripts/plan-status.mjs --summary` or `--plan <file>` instead of reading the plans.
- Repository skills (`.claude/skills/`): `feature-plan`, `new-branch`, `close-increment`, `reference-parity`, `verify-ui`, `onboarding`, `orchestrate-team` and `resolve-issues`. Read-only review subagents (`.claude/agents/`): `db-security-reviewer`, `contract-reviewer` and `reference-explorer`; guide in [`docs/guides/SUBAGENTS.md`](docs/guides/SUBAGENTS.md).
- **Team orchestration:** run `/orchestrate-team` in Claude Code or choose `$orchestrate-team` in Codex. Both use the [shared team workflow](docs/guides/TEAM_WORKFLOW.md). Only the coordinator handles Git and asks the owner. Choose role models with [`configure-agents`](docs/guides/CONFIGURE_AGENTS.md).
- **Issues one at a time** (Claude Code): `/loop /resolve-issues` takes the issues labeled `ai-queue`, opens one PR per issue against `dev` with subagents and waits for the merge before the next one (it merges by itself only if you add `ai-merge`); if an issue is large, it asks whether it goes to the team. Guide in [`docs/guides/RESOLVE_ISSUES.md`](docs/guides/RESOLVE_ISSUES.md).
- MCP servers that touch remote environments (databases, cloud consoles) are configured **read-only**: migrations and deployments to remote environments go through the CLI and through a PR, with the owner's permission.
- Validate what you changed with `scripts/verify.sh` (it picks the areas from the diff; `--list` shows what it would run).
- **GitHub Issues is where work is coordinated** (plans, deferred findings and the agent work queue); the three rules below and the `ai-queue` loop depend on it. Guide in [`docs/guides/GITHUB_ISSUES.md`](docs/guides/GITHUB_ISSUES.md).
- **Findings from the PR review are fixed in that PR.** What the reviewer, Codex on GitHub or a person points out on the PR in progress (P0, P1 and also in-scope P2) is a task on the same branch, with no issue. **Leaving a finding out, or part of it, is the owner's call:** if the agent believes it does not fit (another area, needs its own plan, changes the design), it asks, with the reason and a recommendation, and never silently splits a finding the owner asked to fix.
- **Findings that are not fixed in the PR in progress: one GitHub issue each.** These are the ones the owner decides to leave for later and whatever shows up while testing or during an incident outside the PR: create an issue with the `finding` template (`gh issue create --template finding.md`), **with no secrets or personal data**. First look for a similar one (`gh issue list --search "<words>" --state all`) and, if it exists, comment on it. Once that is decided, there is no need to ask before creating it, but the final answer, the plan's «Result» section and the PR body link each issue on one line. Whoever coordinates or closes the work creates it (reviewers are read-only). Pending owner decisions are not findings (they stay in the plan), nor is what gets fixed in the same PR. The PR that fixes a finding with an existing issue carries `Closes #<n>`; no issue is created just to close it in the same PR.
- **Every new plan has its GitHub issue.** A phase plan is an **epic** (labels `epic` and `enhancement`) and each milestone plan is a **sub-issue** of its epic; a standalone plan (harness, adjustment, fix) is an issue without an epic, with the matching label (`enhancement`, `bug` or `documentation`). The issue is thin: plan title, two or three lines of goal and the link to the file; it never copies tasks, decisions or detail. **The real status lives in the plan header** (`status:`); on GitHub the issue is only open or closed, and the header stores its number (`issue: <n>`). The milestone PR carries `Closes #<n>` and GitHub closes it when merged into `dev` (default branch); the PR of the last milestone of a phase also closes the epic. Findings born from a milestone with an epic hang from that epic as sub-issues. Steps in the `feature-plan` skill.
- **Fast tests and regression tests.** **Unit** tests and **focused** tests (those of the area you changed: `scripts/verify.sh`, the specific test or class your change touches) run **on their own**, without asking. **Regression tests** are the full, slow runs: end-to-end UI suites, simulator runs, integration scripts (`scripts/e2e-*.sh`, `scripts/integration-*.sh`) and any run longer than a few minutes. **They are never launched on their own**: first ask the user directly: **«Do you want the regression tests to run?»**, saying which ones and how long they take. A yes is valid for that batch; the next one is asked again. If the user says no, it is recorded in the PR as «not verified».
- If the project has a functional reference app (see «Project context»), keep business parity with it, not necessarily technical parity.
- Plans carry no dates or time estimates (dates only appear as records in «Owner decisions» and «Result»), and each phase has its own plan in `docs/plans/<product>/phase-N/`.
- Do not duplicate documentation: if something is already described in `docs/`, reference the document instead of repeating its content.

## Owner criteria

Owner decisions that apply to all work. Add your own here: an agent's memory lives on one machine, this file lives in the repository.

- **New branch after each merge.** Before a commit or push, confirm the branch with `git branch --show-current`. If the branch's PR was already merged (the app may leave the session on `dev`), new work goes on a new branch and a new PR against `dev`.
- **PR when the milestone is done, not when the plan is written.** A phase and its first milestone share one branch, published from the first commit (phase plan, then milestone plan, then the implementation). The PR is opened when the milestone is done: a documentation-only PR triggers the whole CI without adding anything. Later milestones go on new branches from `dev` after merging.
- **Always the plan link.** Every answer about a plan in `docs/plans/` (written, changed or approved) carries the link to the file and its address on the published branch, plus the PR URL once it exists; if it changed, say what changed. Format in the `feature-plan` skill.
- **Port, don't redesign** (only if there is a functional reference): screens on a new platform keep the same texts, order and rules as the reference; differences are written down in the plan.
- **Lists and tables filter in the backend.** Search, filters and sorting happen in the database (never only on screen), in batches with a `total` and a way to fetch the next batch.
- **Never reset the local database without asking.** It holds the owner's test data; apply new migrations without wiping it.

## Code Review Rules

Rules for reviewing a PR in this repository (used by Codex and any reviewer). **Write the review in English.** They add to the `Code Review Rules` section of the `AGENTS.md` of each folder the PR changes (`apps/web`, `apps/mobile`, `backend`, `packages/ui`, `shared`).

**PR context.** The base must be `dev`. The PR links its plan in `docs/plans/` or says `No plan: <reason>`. Check that the change does what the plan asks and flag what the plan requires and is missing (tests, status documentation).

**Mark as severe (P0/P1):**
- **Money as floating point.** Every amount is an integer in minor units (cents). `Double`, `Float`, `number` with decimals or rounding on amounts is a bug.
- **Secrets in the repository:** keys, tokens or passwords in code, `.env` files other than `.env.example`, and above all server/service keys in any client app.
- **Cross-tenant leaks:** a query, function or screen that can return data from another organization, account or tenant.
- **Authorization that trusts the client:** role, organization or permissions taken from a parameter or from the UI instead of being checked on the server.
- **Personal data** (email, ID numbers, address, PINs or their verifiers) in logs, error trackers, audit trails, error messages or URLs.
- **Breaking stored data:** an old backup that no longer restores, an already-applied migration that gets edited, a stored event that stops being valid, a persisted model that loses data on update.
- **Generated files edited by hand** without changing their source (the list lives in `.claude/hooks/generated-guard.mjs`; for example `packages/ui/src/tokens.css`, generated from `shared/design/tokens.json`).
- **Business logic without tests:** money calculations, permissions, SQL functions or event rules that are new or changed without a test that covers them.

**Do not flag** (it is a convention or an owner decision):
- That CI does not build the native mobile apps (they are validated locally).
- Style and formatting already covered by `lint`, `typecheck` or the compiler.
- UI differences from the functional reference that the PR's plan declares.
