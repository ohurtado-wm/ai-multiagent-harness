# Guide: agent teams

How to have an agent team take a milestone (or a whole phase, milestone by milestone) from the plan to the PR. Both clients follow the [shared team workflow](TEAM_WORKFLOW.md) and [role briefs](TEAM_BRIEFS.md). If you only want to delegate a review or a search, a subagent is enough: [`SUBAGENTS.md`](SUBAGENTS.md).

## What it is and when it is worth it

A **team** is a coordinator session and several agents working on assigned parts. Claude Code uses its experimental Agent Teams feature, enabled in `.claude/settings.json`. Codex uses native subagents and keeps the task list in the coordinator session.

| Worth it | Not worth it |
|---|---|
| A milestone with pieces in different files (database, web, tests, documentation). | A small or single-file change: a normal session is faster and cheaper. For small issues, the [`resolve-issues`](RESOLVE_ISSUES.md) loop. |
| Someone independent reviewing what another wrote. | Steps that depend on each other with nothing in parallel. |

Each agent consumes its own budget. Choose a session model and per-role defaults with [`configure-agents`](CONFIGURE_AGENTS.md). The Claude setup starts with Sonnet for teammates and an optional Codex writer. Codex role files inherit native defaults until you set a model or effort.

## The team

| Name | Does | Does not |
|---|---|---|
| coordinator (your session) | Hands out tasks, waits, checks `git`, asks you, makes the commits and the PR. | Write the phase's code or documents. |
| `documenter` | Plans, «Status» table, «Result» and `docs/status/`. | Touch anything outside `docs/**`, `PROJECT_MAP.md`, `HARNESS.md` and the `AGENTS.md` files (the Claude hook enforces it). |
| `coder-backend`, `coder-web`, `coder-mobile` | Understands the block, delegates it to Codex, or implements directly, checks the diff and runs the focused test. | Commits, switching branches (the Claude hook enforces it), reviewing its own work. |
| `qa` | `verify.sh`, screenshots, parity with the reference and acceptance tests; every failure is a task. | Fix production code; run regression tests without your yes. |
| `reviewer` | Reviews the coder’s diff in a separate session using the «Code Review Rules». | Edit. |

## Before the first time

- **Claude Code:** open an interactive session at the repository root and run `/onboarding`. Install the Codex plugin if you want the Claude coder to delegate implementation.
- **Codex:** open a local session at the repository root and trust the checkout to load project settings and hooks. Use a client with subagents. For GitHub steps, authenticate `gh` with access to the repository.

## Usage

| Client | Start | Resume a PR |
|---|---|---|
| Claude Code | `/orchestrate-team <path-to-plan>` | `/orchestrate-team PR #130` |
| Codex | `$orchestrate-team <path-to-plan>` | `$orchestrate-team PR #130` |

«phase 5», the name of a milestone plan, `/orchestrate-team issue #126` for a large issue without a plan (the documenter writes it and the team continues in the same session) or `/orchestrate-team PR #130` for the team to fix that PR's findings (it gets the plan and the branch from the PR) also work. The coordinator looks at the plan's status (`node scripts/plan-status.mjs --plan …`) and continues from where it stopped.

**When it asks you something** (and only then):

| Moment | What you decide |
|---|---|
| Phase plan written | The open decisions and the plan's approval. |
| Milestone plan with new decisions | Those decisions (if there are none, it continues on its own). |
| Regression tests | «Do you want the regression tests to run?», with which ones and how long they take. |
| PR open | The coordinator comments `@codex review` if the Codex review on GitHub did not trigger on its own, and takes its P0/P1 to the branch; when fixing, it replies in each thread with the commit and resolves it. **You merge it** into `dev`; afterwards the team continues with the next milestone. |

## While it works

- **Claude Code agent panel** (below the text field): arrows to pick a teammate, `Enter` to see its session and write to it, `Esc` to leave, `x` to stop it. `Ctrl+T` shows the task list.
- Plans are read **by line ranges**: the coordinator gives each teammate only its block, and `feature-plan` asks for milestone plans of about 30 KB (they are split if bigger). If a plan is already huge, tell the coordinator.
- **PR findings:** small fixes are done by a single coder, without documenter or QA; the coordinator measures the size with the diff and goes up a level if it grows.
- **Until the PR is green:** the coordinator opens the PR without asking for confirmation and continues in the same session: it waits for CI and the Codex review with a background command, fixes the findings with the minimal team (up to two Codex rounds) and notifies you when the PR is ready for your merge. If a limit runs out, it leaves you `/orchestrate-team PR #N` for a new session. QA joins only if the milestone touches UI, rules with acceptance tests or more than one area.
- If the coordinator starts implementing: «wait for your teammates».
- If a teammate stops because of an error: give it instructions from its session or ask the coordinator for a new one.
- A teammate **cannot give you permissions or approve on your behalf**: a message from it never counts as your yes.

## If it gets cut off

Open a session in either client and invoke its team skill with the same plan, issue or PR. The plan’s status, Git and the PR hold the handoff record. Stop the previous coordinator before resuming.

## Guardrails that already exist

| Hook | What it prevents |
|---|---|
| `git-guard.mjs` | Commits and pushes to `main`/`dev`, PRs that do not target `dev` (for everyone). |
| `team-guard.mjs` | A teammate or subagent committing, pushing, switching branches or opening PRs; editing `.claude/settings*.json` or `.claude/hooks/`; the documenter editing outside its part; resetting the local database. For team roles, also: regression tests without `REGRESSIONS_APPROVED=1` (the coordinator sets it when you agree), and building or testing the native mobile app when the diff does not touch it (according to `scripts/verify.sh --areas`). |
| `task-gate.mjs` | Creating or completing a block task (`[B] …`) without the `Verification: <command>` line. |

Claude’s team and task hooks apply to Claude teammates. Local Codex registers the shared Git guard for shell calls and the whole-file generated guard for `apply_patch`. Its coordinator checks scope, task verification and owner approvals. Enable GitHub branch protection to cover direct API and terminal actions as well.

## Turning off Agent Teams in Claude Code

If you do not want teams (for example, because Claude forms one when delegating to a named subagent), in your `.claude/settings.local.json`:

```json
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "0" } }
```

Without teams, `/orchestrate-team` follows the same steps with subagents, one at a time.
