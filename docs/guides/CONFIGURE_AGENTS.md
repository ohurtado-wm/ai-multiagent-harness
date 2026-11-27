# Configure agent models

Run `/configure-agents` in Claude Code or select `$configure-agents` in Codex. Run the skill from the main session. Use the current client unless the owner requests a different target. The shared command uses the repository's Node.js runtime and the parsers installed by `npm ci`. Install them once when setting up the repository.

## Ask for scope and models

1. Ask **One agent** or **Whole team**. For one agent, offer **Coordinator**, **Documenter**, **Coder**, **QA** and **PR reviewer**. For Claude Code, also offer the optional **Codex writer**. Honor choices already supplied in the request.
2. From the repository root, run `node scripts/configure-agents.mjs inspect <codex|claude> [role|all]` once per target. Role IDs are `coordinator`, `documenter`, `coder`, `qa`, `pr-reviewer` and, in Claude, `codex-writer`. The command returns the current `roles` and the catalog for each relevant client in `catalogs`. For a Claude whole-team run, the writer is included only if enabled. Reuse this result for the rest of the run. If both clients are requested, ask for the roles of one client before the other.
3. If a catalog returns `permission-denied` and the host offers a permission flow, use it for one bounded attempt with `node scripts/configure-agents.mjs catalog <codex|claude>`. If the catalog is still unavailable, offer **Other** or ask the owner for the exact IDs from their picker. Go directly to the model questions with the resulting list. If the command reports missing parsers, run `npm ci` once and rerun it.
4. Ask which model to use for each selected role, in the order above, one question at a time. Show its current repository model or note inheritance. Use that client's catalog, or the Codex catalog for its writer. Offer all the returned model names and retain their exact IDs. Include **Other** using the picker's built-in text option when available. If the tool limits choices, offer **More roles** or **More models** so every option is reachable. Use a numbered list in chat if the structured tool cannot fit the necessary choices.
5. Default each choice to **high**. If the selected model cannot use the requested effort, ask the owner to pick another model or a supported level. For a custom ID or missing effort metadata, ask the owner to confirm availability and effort in the target client. Honor an explicit request for a different supported effort. Claude's project coordinator setting accepts `low`, `medium`, `high` and `xhigh`.

The catalog command has a four-second deadline per client. On macOS it prefers the installed desktop Codex executable when available. Set `CONFIGURE_AGENTS_CODEX_BIN` or `CONFIGURE_AGENTS_CLAUDE_BIN` to select the executable for a different installation. The commands read account metadata without submitting a model prompt.

## Save the choices

Wait for each answer using the available input tool and reuse the inspection result. Collect the answers before editing. Canceling the selection leaves the files alone. Pass the agreed choices as literal JSON on stdin using one command per configured client:

```sh
node scripts/configure-agents.mjs apply codex <<'JSON'
{
  "coordinator": { "model": "<chosen-coordinator-id>" },
  "coder": { "model": "<chosen-coder-id>", "effort": "high" }
}
JSON
```

Omit roles the owner did not choose. Omit `effort` to use `high`. The command validates the settings before writing, only edits the selected keys and reports changed files. Report the saved model and effort per role and any self-confirmed custom ID. Start a new client session to use the repository changes. For a one-session choice, use the client picker or startup flag. Leave publication to the owner.

| Role | Claude Code | Codex |
|---|---|---|
| Coordinator | `model` and `effortLevel` in [.claude/settings.json](../../.claude/settings.json) | `model` and `model_reasoning_effort` in `.codex/config.toml` |
| Team roles | `model` and `effort` in `.claude/agents/*.md` frontmatter | `model` and `model_reasoning_effort` in `.codex/agents/*.toml` |
| Optional Codex writer | `env.HARNESS_CODEX_WRITER_MODEL` and `env.HARNESS_CODEX_WRITER_EFFORT` in [.claude/settings.json](../../.claude/settings.json) | Uses the regular coder role |

Claude applies role-specific effort to in-process teammates. Split-pane teammates on the lead's model can inherit the lead's effort. Claude roles can use `inherit` to take the session model. To restore a Codex role's native inheritance, remove the relevant key. Client overrides and managed settings can change the effective selection.

- [Claude model picker and effort](https://code.claude.com/docs/en/model-config)
- [Claude Agent SDK session model catalog](https://code.claude.com/docs/en/agent-sdk/typescript)
- [Codex App Server model picker](https://learn.chatgpt.com/docs/app-server)
