# Codex plugin brief for the Claude coder

Use the model and effort selected in the [Claude coder definition](../../agents/coder.md).

```
Repository of the project under development. Read AGENTS.md and <folder>/AGENTS.md before starting.
Goal: <what must be done, in one or two sentences>.
Plan: <path>, lines <a-b> (block <X>) and <c-d> (Contract or Design, if applicable).
You may create or change only: <files or globs>.
Do not touch: any other file, generated files (packages/ui/src/tokens.css), .env*.
Write the focused test together with the code: <which cases: happy, limit, denied>, and run it with: <command>.
Rules: money always as integers in minor units, never floating point; UI texts identical to the functional reference: <source view>.
Do not git commit, push, stash or switch branches.
Answer in a few lines with: files changed, test command and its result, and what you could not do. Do not summarize the diff or copy code.
```

Do not add fields to the answer (the diff is already in `git diff`); a task-specific limit goes as one more line.
