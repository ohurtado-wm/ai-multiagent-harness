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

1. **Create the new repository from the template.** `--include-all-branches` copies both `main` and `dev`; without it, only the default branch is copied:

   ```bash
   gh repo create <owner>/<new-repo> --template ohurtado-wm/ai-multiagent-harness --include-all-branches --private --clone
   ```

2. **Run the setup script** from the new repository's folder. It points `.github/CODEOWNERS` to you (instead of the template owner), makes `dev` the default branch (so `Closes #n` closes issues on merge into `dev`) and creates the GitHub Issues labels (`epic`, `enhancement`, `bug`, `documentation`, `ai-queue`, `ai-merge`, `ai-escalated`). Add `--dry-run` to preview it, or `--codeowner @org/team` to use a team:

   ```bash
   cd <new-repo> && scripts/setup-new-repo.sh
   ```

3. **Commit the `CODEOWNERS` change** on a work branch and open a PR against `dev`; the script prints the exact commands (it never commits to `main` or `dev`). Then read [`docs/guides/GITHUB_ISSUES.md`](docs/guides/GITHUB_ISSUES.md).
4. **Protect `main` and `dev`** in *Settings → Branches* (no direct pushes, required CI checks). A template does not copy branch protection, and it is the only layer that also covers work done outside Claude Code.
5. **Open Claude Code** in the repository root and run `/onboarding`.
6. **Make it yours:** fill in «Project context» in [`AGENTS.md`](AGENTS.md), the folders' `AGENTS.md` and the `area_*` functions of [`scripts/verify.sh`](scripts/verify.sh) with your real stack, and replace the placeholder apps. Full checklist in [`HARNESS.md`](HARNESS.md), «Adopting it in your project».

Check the harness itself at any time:

```sh
npm run test:harness      # hook and script unit tests
scripts/verify.sh docs    # links, hooks, plan table
```

## Requirements

[Claude Code](https://code.claude.com/docs) (recent version; agent teams are experimental), Node.js 20.9+, git and the GitHub CLI (`gh`). Optional: the Codex CLI and the Codex plugin for Claude Code (agent teams delegate code to Codex), Docker for a local database.
