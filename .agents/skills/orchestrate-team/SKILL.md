---
name: orchestrate-team
description: Coordinate Codex subagents for a phase, milestone, GitHub issue or existing PR using the repository's shared team workflow.
---

# Orchestrate a team in Codex

Read the [shared workflow](../../../docs/guides/TEAM_WORKFLOW.md) and use the [role briefs](../../../docs/guides/TEAM_BRIEFS.md). This skill requests Codex subagents for the team.

- Start the needed custom agent definitions from `.codex/agents/`: `documenter`, `coder`, `qa` and `pr-reviewer`. Select the named definition when spawning. Let each role's native settings resolve its model and effort. If this client can spawn subagents but offers no custom-definition selector, read the role file, include its instructions in the brief and pass the owner's configured model and effort if the tool supports them. Applying a role’s configured settings in that fallback preserves the owner’s choice. Ask the owner before substituting an unavailable setting. Use a different model for one run only if the owner requests it.
- Keep the task list in the coordinator session. Include role, assigned files, dependencies and the verification command in every coding brief. Start independent blocks together, wait for agent results, review the returned scope and dispatch dependent blocks when ready. Reuse an agent for follow-up if the client supports it. Keep Git writes and GitHub mutations with the coordinator.
- Ask the owner through the current chat for decisions and regression approval. The coordinator checks task verification, file ownership and approvals directly. Use the repository Git and edit hooks where enabled and treat GitHub branch protection as the remote enforcement layer.
- To watch CI or review, run the shared wait command in a shell session and use the available process wait tool. Resume interrupted work through the same skill with the plan, issue or PR.
