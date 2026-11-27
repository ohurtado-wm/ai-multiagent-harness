# Agent harness — monorepo template

A ready-to-use **harness for orchestrating AI coding agents**, **built on [Claude Code](https://code.claude.com/docs)** (Claude Code as coordinator and reviewer, Codex as code writer), on top of a basic monorepo skeleton. The apps in `apps/`, `backend/` and `packages/` are placeholders: replace them with your project and keep the harness.

- **How it works:** [`HARNESS.md`](HARNESS.md) (start here).
- **Visual site:** open [`docs/site/index.html`](docs/site/index.html) in a browser: a landing page that explains the whole harness with animated diagrams, and links to the **slide deck** [`docs/site/presentation.html`](docs/site/presentation.html) (17 slides; ← → to navigate, F full screen, P print or PDF).
- **Rules for agents:** [`AGENTS.md`](AGENTS.md) (imported by `CLAUDE.md`).
- **Repository map and validation commands:** [`PROJECT_MAP.md`](PROJECT_MAP.md).
- **GitHub Issues integration** (plans, findings and the agent work queue live in issues): [`docs/guides/GITHUB_ISSUES.md`](docs/guides/GITHUB_ISSUES.md).
- **Guides:** [subagents](docs/guides/SUBAGENTS.md), [agent teams](docs/guides/AGENT_TEAMS.md), [issue loop](docs/guides/RESOLVE_ISSUES.md).

## Built on Claude Code

The harness is configuration; Claude Code is the engine that runs it. Each agent has its own context window, and Claude Code is what connects them:

- **Project memory:** `CLAUDE.md` (which imports `AGENTS.md`) is loaded into every session, subagent and teammate, so all agents follow the same rules.
- **Agent teams:** teammates share a task list with dependencies and a mailbox, and the lead is notified when one finishes.
- **Hooks and permissions:** `.claude/settings.json` registers the hooks that check every tool call and the deny rules for protected branches.
- **Skills, subagents, plugins and `/loop`:** the procedures, the roles, the Codex plugin and the self-paced issue loop.

Details and minimum versions: [`HARNESS.md`](HARNESS.md), section 2.

## Quick start: a new repository from this template

Replace `<owner>/<new-repo>` with the account (or organization) and name of your new repository, and check that `gh auth status` shows the account that will own it.

1. **Mark this repository as a template** (once, by its owner; or in *Settings → General → Template repository*):

   ```bash
   gh repo edit ohurtado-wm/ai-multiagent-harness --template
   ```

2. **Create the new repository from the template.** `--include-all-branches` copies both `main` and `dev`; without it, only the default branch is copied:

   ```bash
   gh repo create <owner>/<new-repo> --template ohurtado-wm/ai-multiagent-harness --include-all-branches --private --clone
   ```

3. **Make `dev` the default branch**, so `Closes #n` closes issues when a PR is merged into `dev`. Work branches always target `dev`; a person promotes `dev` to `main`.

   ```bash
   gh repo edit <owner>/<new-repo> --default-branch dev
   ```

4. **Set up GitHub Issues** (a core part of the harness; a template copies files, not labels). From the new repository's folder:

   ```bash
   scripts/setup-github-labels.sh <owner>/<new-repo>
   ```

   It creates `epic`, `enhancement`, `bug`, `documentation`, `ai-queue`, `ai-merge` and `ai-escalated`. Then read [`docs/guides/GITHUB_ISSUES.md`](docs/guides/GITHUB_ISSUES.md).

5. **Protect `main` and `dev`** in *Settings → Branches* (no direct pushes, required CI checks). A template does not copy branch protection, and it is the only layer that also covers work done outside Claude Code.
6. **Open Claude Code** in the repository root and run `/onboarding`.
7. **Make it yours:** fill in «Project context» in [`AGENTS.md`](AGENTS.md), the folders' `AGENTS.md` and the `area_*` functions of [`scripts/verify.sh`](scripts/verify.sh) with your real stack, and replace the placeholder apps. Full checklist in [`HARNESS.md`](HARNESS.md), «Adopting it in your project».

Check the harness itself at any time:

```sh
npm run test:harness      # hook and script unit tests
scripts/verify.sh docs    # links, hooks, plan table
```

## Requirements

[Claude Code](https://code.claude.com/docs) (recent version; agent teams are experimental), Node.js 20.9+, git and the GitHub CLI (`gh`). Optional: the Codex CLI and the Codex plugin for Claude Code (agent teams delegate code to Codex), Docker for a local database.
