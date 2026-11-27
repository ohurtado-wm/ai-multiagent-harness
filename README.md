# Agent harness — monorepo template

A ready-to-use **harness for orchestrating AI coding agents**, using [Claude Code](https://code.claude.com/docs) or [Codex](https://learn.chatgpt.com/docs/agent-configuration/subagents) as coordinator, on top of a basic monorepo skeleton. The apps in `apps/`, `backend/` and `packages/` are placeholders: replace them with your project and keep the harness.

- **How it works:** [`HARNESS.md`](HARNESS.md) (start here).
- **Visual site:** open [`docs/site/index.html`](docs/site/index.html) in a browser: a landing page that explains the whole harness with animated diagrams, and links to the **slide deck** [`docs/site/presentation.html`](docs/site/presentation.html) (17 slides; ← → to navigate, F full screen, P print or PDF).
- **Rules for agents:** [`AGENTS.md`](AGENTS.md) (imported by `CLAUDE.md`).
- **Repository map and validation commands:** [`PROJECT_MAP.md`](PROJECT_MAP.md).
- **GitHub Issues integration** (plans, findings and the agent work queue live in issues): [`docs/guides/GITHUB_ISSUES.md`](docs/guides/GITHUB_ISSUES.md).
- **Guides:** [subagents](docs/guides/SUBAGENTS.md), [agent teams](docs/guides/AGENT_TEAMS.md), [issue loop](docs/guides/RESOLVE_ISSUES.md).

## Choose a coordinator

| Client | Start a team | Configure model defaults |
|---|---|---|
| Claude Code | `/orchestrate-team <plan>` | `/configure-agents` |
| Codex | Choose `$orchestrate-team` and provide the plan | Choose `$configure-agents` |

Either client can start or resume work using a plan path, `issue #N` or `PR #N`. The plan, branch and GitHub PR hold the shared state. See the [team guide](docs/guides/AGENT_TEAMS.md) and [model configuration](docs/guides/CONFIGURE_AGENTS.md).

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
4. **Protect `main` and `dev`** in *Settings → Branches* (no direct pushes, required CI checks). A template does not copy branch protection, and it also covers work done from either client or a terminal.
5. **Open your coordinator** in the repository root. In Claude Code, run `/onboarding`. In Codex, trust the checkout to enable repository settings and hooks, then select the team skill. Configure model defaults with `configure-agents` when needed.
6. **Make it yours:** fill in «Project context» in [`AGENTS.md`](AGENTS.md), the folders' `AGENTS.md` and the `area_*` functions of [`scripts/verify.sh`](scripts/verify.sh) with your real stack, and replace the placeholder apps. Full checklist in [`HARNESS.md`](HARNESS.md), «Adopting it in your project».

Check the harness itself at any time:

```sh
npm ci                    # install the harness parsers
npm run test:harness      # hook and script unit tests
scripts/verify.sh docs    # links, hooks, plan table
```

## Requirements

Node.js 20.9+, Git, the GitHub CLI (`gh`) and a local [Claude Code](https://code.claude.com/docs) or [Codex](https://learn.chatgpt.com/docs/agent-configuration/subagents) client with subagents. The Codex plugin is optional when Claude coordinates. The scheduled `/loop /resolve-issues` skill runs in Claude Code.
