---
status: in-validation
parent: PLAN_HARNESS.md
issue: 11
---

# Harness: guide model selection in configure-agents

## Scope

Make the configuration skill interactive in both clients. Let the owner choose one agent or the whole team, select a model for each role, and use high reasoning effort by default.

## Tasks

- Update both skill entry points and the shared guide with the scope question and the per-role model picker.
- Use each client's live catalog when available, expose all selectable models and an Other option, and handle model-specific effort limits.
- Apply the selected settings to the native files and preserve unrelated configuration.

- Move catalog lookup to a bounded command that returns model IDs, names and supported effort levels. Reuse its result for the entire configuration session and allow a custom ID when it is unavailable.
- Provide one command to update and validate the selected native settings, preserving existing role choices and unrelated settings.

## Tests

- Verify docs, skill frontmatter and the harness tests.
- Review the flow for one role, the full team, paginated models, a custom ID and a model that cannot use high.

- Exercise catalog discovery, fallback and native settings updates in an isolated checkout. Compare time to first model choice and token counts with the original run when a live run with the same inputs is available.

## Closing criteria

1. An interactive run starts by asking whether to configure one agent or all. A single-agent run presents the team roles as choices.
2. Each selected role gets its own model question, with the full available catalog reachable and an Other option.
3. Each configured role is written with high effort by default, or with an effort the owner explicitly chooses.
4. Changes are validated as a batch and remain visible in Git.
5. The skill can reach its first model question after one bounded catalog lookup and apply all confirmed choices with one command.

## Result

Both clients ask for the scope and the model for each role. The settings command defaults to high, accepts confirmed custom IDs, and keeps the Claude Code writer separate.

The first interactive Codex run took 3 min 58 s, including 2 min 04 s before the first model question. Both skills now reuse one bounded catalog lookup per target and apply the chosen settings with one command. The native parsers preserve existing settings and validate each edit before any file is replaced. The Claude QA description needed quoting for its original frontmatter to parse.

The live catalog and settings commands were exercised for both clients. With catalog access, inspection took approximately one second per team, and each five-role batch took under 50 ms to validate and save in a temporary copy. The docs checks and all 82 harness tests passed. A complete interactive rerun and its token count remain to be measured.
