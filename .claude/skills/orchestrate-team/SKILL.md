---
name: orchestrate-team
description: Coordinate Claude Code teammates for a phase, milestone, GitHub issue or existing PR using the repository's shared team workflow.
---

# Orchestrate a team in Claude Code

Read [the shared workflow](../../../docs/guides/TEAM_WORKFLOW.md) and follow it as coordinator. Use its [role briefs](../../../docs/guides/TEAM_BRIEFS.md). The workflows below tell you how to invoke each role in this client.

- In an interactive session with Agent Teams enabled, create a team and start the named `documenter`, `coder`, `qa` and `pr-reviewer` definitions from `.claude/agents/` as needed. Use the task and message tools to record dependencies, delegate and wait. When Agent Teams are disabled or unavailable, run these definitions as foreground subagents, serializing writers that share files.
- Let each role's `model` field take effect. Pass a per-call model only when the owner explicitly requests a one-run override. The coordinator uses the owner's selected session model.
- Coders use the optional Codex plugin through the [Claude coder definition](../../agents/coder.md). If the plugin is unavailable or disabled, the Claude coder implements directly and reports the fallback.
- Use `AskUserQuestion` for owner decisions. The `task-gate` and `team-guard` hooks provide the Claude-specific checks described in the [team guide](../../../docs/guides/AGENT_TEAMS.md).
