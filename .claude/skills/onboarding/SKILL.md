---
name: onboarding
description: Prepares the working environment on a new machine. Checks and installs the required skills (find-skills, frontend-design, webapp-testing) and checks git, gh, Node, Docker, Codex and other tools; for whatever is missing, it gives installation instructions. It starts by showing a summary of the monorepo structure and what is expected from contributors. Use it when someone says "onboarding", "set up the environment", "configure the machine" or when starting in the repo for the first time.
---

# Onboarding

Leaves the machine ready to work on the monorepo. It is **diagnosis first**: do not install system software without the user's confirmation.

## Step 0 — Monorepo summary (always first)

Before checking anything, present to the person a summary of how the repo is organized and what is expected from them. **Read it from the sources, not from memory**, so it does not go stale or duplicate documentation:

1. Read `PROJECT_MAP.md` (main paths). The status (`docs/PROJECT_STATUS.md` and `docs/status/`) is for reference: open it only if you need to know what is done in an area.
2. Read `AGENTS.md` (repository and working rules) and, if they want the big picture, point them to `HARNESS.md`.

Show, in a few lines:

- **What the project is:** from «Project context» in `AGENTS.md`.
- **Folder map:** a table with each path in `apps/`, `backend/`, `packages/`, `docs/` and `shared/`, what it contains and its real status (in development, planned, reserved without code).
- **What is expected from contributors**, taken from `AGENTS.md`:
  - Read `PROJECT_MAP.md` before making changes.
  - Never commit or open PRs directly to `main`; PRs go to `dev`, and a person promotes `dev` to `main`.
  - Write a plan in `docs/plans/` before implementing a feature.
  - Keep parity with the functional reference (if any) and update `PROJECT_MAP.md` when closing an increment.
- **Where to keep reading:** links to `PROJECT_MAP.md`, `HARNESS.md`, the project status and the plans in `docs/plans/`.

If something in `AGENTS.md` differs from this list, `AGENTS.md` wins. End by asking which part the person will work on (web, mobile, backend, harness) and continue with the diagnosis.

## Step 1 — Diagnosis

Run from the repository root:

```bash
.claude/skills/onboarding/scripts/check.sh
```

The first line (`INFO os`) shows the operating system: `mac`, `windows` (requires Git Bash or WSL to run the script) or `other`. Each line is `OK`, `WARN` or `MISSING`. Summarize the result for the user in a short table.

## Step 2 — Required skills

Mandatory order: first `find-skills`, then the rest with it.

1. **find-skills** (`skill:find-skills`). If missing, it is the only one installed directly:
   ```bash
   npx skills add vercel-labs/skills --skill find-skills -g -y -a claude-code -a codex
   ```
   If the command fails or the repo changed, tell the user and ask for the source; do not guess.
2. Once available, **invoke `find-skills`** to locate and install the missing ones:
   - **anthropics/skills** (`frontend-design`, `webapp-testing`): UI design and web testing with Playwright.
   - Any stack-specific skill your team uses (database, framework best practices). Add them here and to `scripts/check.sh`.

   Install them one repo at a time (`-a claude-code -a codex` installs for Claude Code and Codex at once):
   ```bash
   npx skills add anthropics/skills --skill frontend-design --skill webapp-testing -g -y -a claude-code -a codex
   ```
3. Before installing, show the user the name and source of each skill and wait for their confirmation (it is third-party code that runs with their permissions).
4. Skills end up in `~/.agents/skills` (Codex's location) with a symlink in `~/.claude/skills` for Claude Code. If the user only uses one of the two agents, the matching `-a` is enough.
5. After installing, run `check.sh` again. Warn that new skills load when the Claude Code **session restarts**.

## Step 3 — System tools

For each `MISSING`, give the instruction from the table for the operating system and offer to run it. Install only with explicit confirmation.

| Item | What for | Mac | Windows |
|---|---|---|---|
| `git` | Version control | `xcode-select --install` | `winget install Git.Git` |
| `gh` | Pull requests, issues, labels | `brew install gh` and `gh auth login` | `winget install GitHub.cli` and `gh auth login` |
| `node`, `npm`, `npx` | Harness scripts and hooks, web apps, skills installer | `brew install node` | `winget install OpenJS.NodeJS.LTS` |
| `brew` | Package manager | Instructions at https://brew.sh | Not applicable |
| `docker` (optional, `WARN`) | Local database and services | `brew install --cask docker`, open Docker Desktop once and wait for the daemon | `winget install Docker.DockerDesktop` (requires WSL 2) and open Docker Desktop |
| `codex` (optional, `WARN`) | Agent teams delegate the code to Codex ([`AGENT_TEAMS.md`](../../../docs/guides/AGENT_TEAMS.md)) | `npm install -g @openai/codex` and `codex login` (the user does it) | Same |
| `plugin:codex` (optional, `WARN`) | Calling Codex from Claude Code (`codex:codex-rescue`) | In a terminal: `claude plugin marketplace add openai/codex-plugin-cc` and `claude plugin install codex@openai-codex`; then `/codex:setup` in a new session | Same |

Notes:
- Docker installed but with the daemon off counts as `WARN`: ask them to open Docker Desktop.
- Add your stack's toolchain (database CLI, Xcode, JDK, language runtimes) to this table and to `scripts/check.sh`.
- Keep this table and `scripts/check.sh` in sync: if you add a tool to one, add it to the other.

## Step 3b — GitHub Issues

The harness coordinates work through GitHub Issues (plans, findings, the `ai-queue` loop). Check that `gh auth status` is signed in and that the labels exist (`gh label list`); if they are missing, offer to run `scripts/setup-github-labels.sh` (it needs write access to the repository). Point the person to [`GITHUB_ISSUES.md`](../../../docs/guides/GITHUB_ISSUES.md).

## Step 4 — Closing

1. Run `check.sh` again and report what is `OK` and what is still pending, without hiding failures.
2. Remind them to read `PROJECT_MAP.md` before making changes; the status (`docs/status/`) only if needed (rule in `AGENTS.md`).
