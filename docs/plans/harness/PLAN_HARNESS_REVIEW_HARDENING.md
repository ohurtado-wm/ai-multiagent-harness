---
status: in-validation
parent: PLAN_HARNESS.md
issue: 1
---

# Plan — Harness: hardening after the review against the official docs

Standalone harness plan of [`PLAN_HARNESS.md`](PLAN_HARNESS.md). The harness was checked against the official Claude Code documentation (agent teams, subagents, hooks, permissions, memory, best practices, costs) and two Anthropic engineering posts on multi-agent systems. The design matches the recommendations; this plan applies the five improvements the review found. When done, **folder rules load in every Claude Code version, safety hooks block when they crash, a permission layer backs them up, waiting teammates keep their cache and the session context reads as facts**.

## Status

| Block | Contents | Status |
|---|---|---|
| A | Folder `CLAUDE.md` files that import their `AGENTS.md` | Done |
| B | Safety hooks fail closed (`onFailure: "block"`, `timeout`) | Done; live-session behavior not verified |
| C | Permission deny rules as a second layer for protected branches | Done; live-session behavior not verified |
| D | One-hour prompt cache for subagents and teammates | Done; live-session behavior not verified |
| E | Session context written as facts; tests and documentation | Done |

**Out of this plan:** a `TeammateIdle` hook that requires the report file, and `isolation: worktree` for loop subagents: both add complexity and wait for a pilot on a real repository.

## Owner decisions (2026-11-27)

| Topic | Decision |
|---|---|
| Scope | **Apply all five improvements** in one PR against `dev`. |

## Design

- **Folder rules (A):** Claude Code reads a nested `AGENTS.md` only from v2.1.277 and only when that folder has no `CLAUDE.md`; a one-line `CLAUDE.md` with `@AGENTS.md` per folder (as the root already does) works in every version and keeps a single source. Source: [memory docs](https://code.claude.com/docs/en/memory).
- **Fail closed (B):** without `onFailure`, a hook that crashes or times out lets the action proceed. `onFailure: "block"` (v2.1.295+) on `git-guard`, `team-guard` and `generated-guard`, with `timeout: 30` seconds. Invalid JSON input is still let through by the scripts themselves (unchanged, covered by tests). `task-gate` is left as is: `onFailure` has no effect on `TaskCompleted`. Source: [hooks reference](https://code.claude.com/docs/en/hooks).
- **Permission layer (C):** the docs recommend the permission system for hard denies; deny rules apply to every subcommand and cannot be overridden by an allow rule. Deny pushes to `main`/`dev` (`git push * main`, `git push *:main`, same for `dev`), forced pushes (`--force`, `-f`; `--force-with-lease` stays allowed) and `--all`/`--mirror`. `git-guard` stays as the first layer: it also covers `git -C`, `cd` and `bash -c` forms the rule syntax cannot see. Source: [permissions](https://code.claude.com/docs/en/permissions).
- **Cache (D):** teammates' and subagents' prompt cache lasts five minutes by default; coders wait for Codex up to nine. `"subagentPromptCacheTtl": "1h"` at the top level of `.claude/settings.json` (v2.1.242+). Source: [agent teams](https://code.claude.com/docs/en/agent-teams).
- **Factual context (E):** hook context written as commands can trigger Claude's prompt-injection defenses; the session hook states facts («`dev` is a protected branch: commits go on a work branch») instead of orders.

## Block A — Folder CLAUDE.md

Owner: `documenter`. Files: `apps/web/CLAUDE.md`, `apps/mobile/CLAUDE.md`, `backend/CLAUDE.md`, `packages/ui/CLAUDE.md`, `shared/CLAUDE.md`, `AGENTS.md`, `HARNESS.md`.

Verification: `scripts/verify.sh docs`

## Block B — Fail-closed safety hooks

Owner: coordinator. Files: `.claude/settings.json`.

Verification: `node -e 'JSON.parse(require("fs").readFileSync(".claude/settings.json"))'` and `scripts/verify.sh docs`

## Block C — Permission deny rules

Owner: coordinator. Files: `.claude/settings.json`.

Verification: same as block B.

## Block D — Prompt cache for teammates

Owner: coordinator. Files: `.claude/settings.json`, `docs/guides/AGENT_TEAMS.md`.

Verification: same as block B.

## Block E — Factual session context, tests and documentation

Owner: coordinator. Files: `.claude/hooks/session-context.mjs` and its test, `HARNESS.md`, `docs/status/harness.md`.

Verification: `npm run test:harness` and `scripts/verify.sh`

## Closing criteria

1. Every folder with an `AGENTS.md` has a `CLAUDE.md` that imports it.
2. `git-guard`, `team-guard` and `generated-guard` declare `onFailure: "block"` and a `timeout`.
3. `permissions.deny` blocks pushes to `main`/`dev`, forced pushes, `--all` and `--mirror`, while `--force-with-lease` to a work branch stays allowed.
4. `subagentPromptCacheTtl` is `1h`.
5. The session context has no imperative sentences; harness tests and `scripts/verify.sh` green.

## Risks

- **Older Claude Code versions** ignore `onFailure` and `subagentPromptCacheTtl`: the harness behaves as before, no worse. Documented in `HARNESS.md`.
- **A broken hook now blocks every Bash call:** intended for safety hooks; the fix is in `.claude/hooks/` and its unit tests run in CI.
- **Deny rules also bind the coordinator:** intended, the rules already forbid those pushes for every agent.

## Result (2026-11-27)

- **A:** `CLAUDE.md` (`@AGENTS.md`) in the five folders; `AGENTS.md` and `HARNESS.md` say every folder with an `AGENTS.md` gets one.
- **B, C, D:** `.claude/settings.json` now registers the three safety hooks with `onFailure: "block"` and `timeout: 30`, adds 12 deny rules for pushes to `main`/`dev`, forced pushes, `--all` and `--mirror`, and sets `subagentPromptCacheTtl: "1h"`.
- **E:** `session-context.mjs` states facts; its test was updated. `npm run test:harness` and `scripts/verify.sh` green (numbers in the PR).

### Differences from the plan

- None.

### What was not verified

- That a live Claude Code session (v2.1.295+) blocks on a crashed hook, applies the deny rules and keeps the one-hour cache: these are Claude Code behaviors that unit tests cannot exercise.

## Open questions

None.
