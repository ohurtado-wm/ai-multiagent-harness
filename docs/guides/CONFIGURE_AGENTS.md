# Configure agent models

Run `/configure-agents` in Claude Code or choose `$configure-agents` in Codex. Either skill can configure Claude Code, Codex or both. For example, “Configure the Codex coder and reviewer with these model IDs: <coder-model> and <reviewer-model>. Leave the other roles as they are.”

## Procedure

1. Read [.claude/settings.json](../../.claude/settings.json), the Claude role definitions and the Codex role definitions for the requested changes. Read `.codex/config.toml` if it exists. Summarize the current repository defaults for the relevant roles.
2. Ask which client and roles to change and what model or effort the owner wants where they have left a choice open. Offer only models confirmed by the client’s picker, model catalog or provider documentation. If account availability cannot be checked, ask for the model ID the owner can select. Treat requested values as data.
3. Change only the relevant native settings using the table below. Keep unrelated models, instructions and settings. For a one-session choice, use the client’s model picker or startup flag instead of changing the repository default.
4. Review the diff, parse any changed JSON or TOML and run `scripts/verify.sh --strict docs`. Report the changed defaults and any model availability you could not verify. Start a new session to validate changes to local client configuration and role definitions. Leave publication to the owner.

## Where the settings live

| Role | Claude Code | Codex |
|---|---|---|
| Coordinator | Top-level `model` in [.claude/settings.json](../../.claude/settings.json), or the session model | Top-level `model` and optional `model_reasoning_effort` in `.codex/config.toml`, or the session picker |
| Documenter | [documenter.md](../../.claude/agents/documenter.md), frontmatter `model` | [documenter.toml](../../.codex/agents/documenter.toml) |
| Coder | [coder.md](../../.claude/agents/coder.md), frontmatter `model` | [coder.toml](../../.codex/agents/coder.toml) |
| QA | [qa.md](../../.claude/agents/qa.md), frontmatter `model` | [qa.toml](../../.codex/agents/qa.toml) |
| PR reviewer | [pr-reviewer.md](../../.claude/agents/pr-reviewer.md), frontmatter `model` | [pr-reviewer.toml](../../.codex/agents/pr-reviewer.toml) |
| Codex writer started by a Claude coder | `env.HARNESS_CODEX_WRITER_MODEL` and `env.HARNESS_CODEX_WRITER_EFFORT` in [.claude/settings.json](../../.claude/settings.json) | Codex implements directly via its coder role |

Claude roles use the `sonnet` alias by default. Use `model: inherit` to inherit the session model, or set a supported alias or full model ID. Keep the bridge enabled with `env.HARNESS_CODEX_WRITER_ENABLED` set to `"1"`, or set it to `"0"` for the Claude coder to write directly. The bridge selection is separate from the Claude coder's own model.

In Codex role files, put `model = "<available-model-id>"` and optionally `model_reasoning_effort = "<supported-effort>"` **before** the first TOML table. Remove a role key to restore native inheritance. The shipped role files leave these keys unset, so Codex resolves them from any configured agent defaults and the session. Use models and effort levels supported by the client and its provider.

Native precedence still applies. A per-call model override or managed settings can change the effective selection. A Claude installation with a forced subagent model can override role defaults. Model choices do not change role permissions or select the model for the optional GitHub review.

- [Claude Code subagent models](https://code.claude.com/docs/en/sub-agents#choose-a-model)
- [Claude Code settings](https://code.claude.com/docs/en/settings)
- [Codex subagent models and reasoning](https://learn.chatgpt.com/docs/agent-configuration/subagents#choosing-models-and-reasoning)
