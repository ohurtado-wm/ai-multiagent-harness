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

## Quick start

1. Copy this folder into a new repository (or use it as a GitHub template) and make the first commit on `main`.
2. Create the integration branch `dev` and make it the default branch on GitHub. Work branches always target `dev`; a person promotes `dev` to `main`.
3. **Set up GitHub Issues** (a core part of the harness): run `scripts/setup-github-labels.sh` to create the labels (`epic`, `enhancement`, `bug`, `documentation`, `ai-queue`, `ai-merge`, `ai-escalated`) and read [`docs/guides/GITHUB_ISSUES.md`](docs/guides/GITHUB_ISSUES.md).
4. Open Claude Code in the repository root and run `/onboarding`.
5. Fill in «Project context» in [`AGENTS.md`](AGENTS.md), the folders' `AGENTS.md` and the `area_*` functions of [`scripts/verify.sh`](scripts/verify.sh) with your real stack.

Check the harness itself at any time:

```sh
npm run test:harness      # hook and script unit tests
scripts/verify.sh docs    # links, hooks, plan table
```

## Requirements

[Claude Code](https://code.claude.com/docs) (recent version; agent teams are experimental), Node.js 20.9+, git and the GitHub CLI (`gh`). Optional: the Codex CLI and the Codex plugin for Claude Code (agent teams delegate code to Codex), Docker for a local database.
