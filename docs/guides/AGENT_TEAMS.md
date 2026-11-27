# Guide: agent teams

How to have an agent team take a milestone (or a whole phase, milestone by milestone) from the plan to the PR. Skill: [`orchestrate-team`](../../.claude/skills/orchestrate-team/SKILL.md). If you only want to delegate a review or a search, a subagent is enough: [`SUBAGENTS.md`](SUBAGENTS.md).

## What it is and when it is worth it

A **team** is several Claude Code sessions working at once: a **coordinator** (your session) and **teammates**, each with its own context, a shared task list and messages between them. It is an **experimental** Claude Code feature, enabled in this repository by `.claude/settings.json`.

| Worth it | Not worth it |
|---|---|
| A milestone with pieces in different files (database, web, tests, documentation). | A small or single-file change: a normal session is faster and cheaper. For small issues, the [`resolve-issues`](RESOLVE_ISSUES.md) loop. |
| Someone independent reviewing what another wrote. | Steps that depend on each other with nothing in parallel. |

It costs more than one session: every teammate spends its own budget (Anthropic's cost guide puts teams at several times the tokens of a single session, roughly in proportion to team size). That is why the team uses **the most capable model only for the coordinator**, a **cheaper model** (Sonnet) for the teammates, and delegates the **code to Codex**, which is charged to your Codex limit. `.claude/settings.json` sets `"subagentPromptCacheTtl": "1h"`: by default a teammate's prompt cache lasts five minutes, and coders often wait longer than that for Codex.

## The team

| Name | Does | Does not |
|---|---|---|
| coordinator (your session) | Hands out tasks, waits, checks `git`, asks you, makes the commits and the PR. | Write the phase's code or documents. |
| `documenter` | Plans, «Status» table, «Result» and `docs/status/`. | Touch anything outside `docs/**`, `PROJECT_MAP.md`, `HARNESS.md` and the `AGENTS.md` files (a hook prevents it). |
| `coder-backend`, `coder-web`, `coder-mobile` | Understands the block, delegates it to Codex, checks the diff and runs the focused test. | Commits, switching branches (a hook prevents it), reviewing its own work. |
| `qa` | `verify.sh`, screenshots, parity with the reference and acceptance tests; every failure is a task. | Fix production code; run regression tests without your yes. |
| `reviewer` | Reviews in Claude the code Codex wrote, with the «Code Review Rules». | Edit. |

## Before the first time

1. `/onboarding` must show `codex` and `plugin:codex` as `OK`. If not: `npm install -g @openai/codex`, `codex login`, and in a terminal `claude plugin marketplace add openai/codex-plugin-cc` and `claude plugin install codex@openai-codex`; then `/codex:setup` in a new session.
2. Open **a terminal** at the repository root and start `claude` with the most capable model. Teams are formed in interactive terminal sessions.
3. Permission mode **auto** (`Shift+Tab` until you see it): teammates inherit the coordinator's mode and their permission prompts reach you.
4. Optional: split panes. By default all of them run in your terminal; with tmux or iTerm2 each teammate gets its own pane. It is configured in **your** `~/.claude/settings.json` (not in the repository): `"teammateMode": "auto"`.

## Usage

```
/orchestrate-team docs/plans/<product>/phase-5/PLAN_PHASE_5_<TOPIC>.md
```

«phase 5», the name of a milestone plan, `/orchestrate-team issue #126` for a large issue without a plan (the documenter writes it and the team continues in the same session) or `/orchestrate-team PR #130` for the team to fix that PR's findings (it gets the plan and the branch from the PR) also work. The coordinator looks at the plan's status (`node scripts/plan-status.mjs --plan …`) and continues from where it stopped.

**When it asks you something** (and only then):

| Moment | What you decide |
|---|---|
| Phase plan written | The open decisions and the plan's approval. |
| Milestone plan with new decisions | Those decisions (if there are none, it continues on its own). |
| Regression tests | «Do you want the regression tests to run?», with which ones and how long they take. |
| PR open | The coordinator comments `@codex review` if the Codex review on GitHub did not trigger on its own, and takes its P0/P1 to the branch; when fixing, it replies in each thread with the commit and resolves it. **You merge it** into `dev`; afterwards the team continues with the next milestone. |

## While it works

- **Agent panel** (below the text field): arrows to pick a teammate, `Enter` to see its session and write to it, `Esc` to leave, `x` to stop it. `Ctrl+T` shows the task list.
- Plans are read **by line ranges**: the coordinator gives each teammate only its block, and `feature-plan` asks for milestone plans of about 30 KB (they are split if bigger). If a plan is already huge, tell the coordinator.
- **PR findings:** small fixes are done by a single coder, without documenter or QA; the coordinator measures the size with the diff and goes up a level if it grows.
- **Until the PR is green:** the coordinator opens the PR without asking for confirmation and continues in the same session: it waits for CI and the Codex review with a background command, fixes the findings with the minimal team (up to two Codex rounds) and notifies you when the PR is ready for your merge. If a limit runs out, it leaves you `/orchestrate-team PR #N` for a new session. QA joins only if the milestone touches UI, rules with acceptance tests or more than one area.
- If the coordinator starts implementing: «wait for your teammates».
- If a teammate stops because of an error: give it instructions from its session or ask the coordinator for a new one.
- A teammate **cannot give you permissions or approve on your behalf**: a message from it never counts as your yes.

## If it gets cut off

Teammates do not come back with `/resume`. Open a new session and run `/orchestrate-team` with the same plan: the plan's «Status» table and `git log` say where it stopped.

## Guardrails that already exist

| Hook | What it prevents |
|---|---|
| `git-guard.mjs` | Commits and pushes to `main`/`dev`, PRs that do not target `dev` (for everyone). |
| `team-guard.mjs` | A teammate or subagent committing, pushing, switching branches or opening PRs; editing `.claude/settings*.json` or `.claude/hooks/`; the documenter editing outside its part; resetting the local database. For team roles, also: regression tests without `REGRESSIONS_APPROVED=1` (the coordinator sets it when you agree), and building or testing the native mobile app when the diff does not touch it (according to `scripts/verify.sh --areas`). |
| `task-gate.mjs` | Creating or completing a block task (`[B] …`) without the `Verification: <command>` line. |

Codex runs outside Claude Code and **does not go through these hooks**: that is why the coder checks `git status` and `git diff` every time Codex returns, and only the coordinator commits.

## Turning it off on your machine

If you do not want teams (for example, because Claude forms one when delegating to a named subagent), in your `.claude/settings.local.json`:

```json
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "0" } }
```

Without teams, `/orchestrate-team` follows the same steps with subagents, one at a time.
