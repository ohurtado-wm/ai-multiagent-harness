# Guide: subagents

How to use the repository's subagents (`.claude/agents/`) and how to create new ones. Meant for learning by doing: at the end there are three exercises. Overview of the whole harness: [`HARNESS.md`](../../HARNESS.md).

## What a subagent is

A subagent is another Claude instance that receives **one narrow task**, works in its **own context** and returns **only a summary**. What it reads (hundreds of lines of SQL, dozens of source files) does not fill the main conversation.

| Worth it when… | Not worth it when… |
|---|---|
| You need to **read a lot** and only the conclusion matters (finding the origin of a screen in the reference app). | The change is small or in a single file: doing it directly is faster. |
| You want an **independent second opinion** (reviewing a migration without the bias of whoever wrote it). | Each step depends on the result of the previous one (nothing to parallelize). |
| There is **parallel work** and the parts do not overlap (reviewing the contract and the database at the same time). | You need to adjust with the person step by step: a subagent does not converse halfway. |

Two important things: the subagent **does not see your conversation** (everything it needs must go in the brief) and **its report is an opinion, not a fact**: verify what matters before acting.

## The ones in this repository

The reviewers are **read-only** (`tools: Read, Grep, Glob`, without `Bash`, `Edit` or `Write`): they can review, but they cannot break anything. If a reviewer needs the tests to run, it says so in its answer and you run them with `scripts/verify.sh`.

| Subagent | What for | When |
|---|---|---|
| `db-security-reviewer` | Reviews migrations, access policies, privileged functions and database tests: tenant isolation, authorization inside the function, denied path tested. | After writing or changing a migration or a database function. |
| `contract-reviewer` | Reviews changes in `shared/schemas` and `shared/fixtures`: backward compatibility, valid and invalid examples, documentation, clients. | When adding or changing a message type or a payload field. |
| `reference-explorer` | Searches the functional reference app for the origin of a screen or rule and returns exact paths, signatures and texts. | Before porting a screen; the `reference-parity` skill uses it. |

**Phase team roles.** These four **do edit or run things** and are designed as teammates of an agent team, although they also work as standalone subagents. Each file says which files belong to it and what it does not do; none of them commits. Flow in [`AGENT_TEAMS.md`](AGENT_TEAMS.md).

| Role | What for | Can |
|---|---|---|
| `documenter` | Phase or milestone plan (`feature-plan`), «Status» table, «Result» and `docs/status/`. | Edit `docs/**`, `PROJECT_MAP.md`, `HARNESS.md` and the `AGENTS.md` files. |
| `coder` | Implements a block in its area by delegating the code to Codex and verifies it with the focused test. | Edit its area and call Codex. |
| `qa` | `verify.sh`, `verify-ui`, `reference-parity` and acceptance tests; every failure is a task for the coder. | Write acceptance tests and run checks (regression tests only with permission). |
| `pr-reviewer` | Reviews the milestone diff with the «Code Review Rules» (Codex writes the code, Claude reviews it). | Only read, including `git diff`. |

Every file has the same skeleton:

```markdown
---
name: db-security-reviewer
description: When to use it (Claude reads it to decide whether to delegate)…
tools: Read, Grep, Glob
model: sonnet
---
Instructions for the role: what to review, how to answer, what not to do.
```

## How they are invoked

1. **By asking in the conversation:** «use `db-security-reviewer` on the migration I just wrote». It is the clearest way when starting.
2. **Automatic delegation:** Claude reads the `description` field and decides to delegate when the task fits. If a subagent never activates, sharpen its `description` (more concrete, with phrases a person would say: «review the migration»).
3. **In parallel:** ask for several reviews at once («launch `contract-reviewer` and `db-security-reviewer` in parallel on this change»). They run at the same time and each one returns its report.

**Important:** Claude Code loads subagents when the session starts. If you just created or changed a file in `.claude/agents/`, **restart the session** (or use the `/agents` command in an interactive terminal) for it to show up.

## How to read the report

- Reviewers return a table `Severity | Where | Finding | Suggestion` with `file:line` citations, plus «What I reviewed» and «What I could not verify».
- **Check the citations:** open the file at that line. A finding without a real citation is discarded.
- **High severity** (cross-tenant leak, unauthorized access, compatibility break) is fixed before continuing; **medium** and **low** are fixed in the same PR by default.
- «What I could not verify» tells you what you must run (`scripts/verify.sh backend`, `contracts`, etc.).
- A report without findings does not prove there are no errors: it says that **this reviewer, with these files**, did not see any.

## How to create a new one

1. Create `.claude/agents/<name>.md` with the skeleton above. The name is lowercase with hyphens.
2. **`description`:** one sentence with *when* to use it and examples of how someone would ask for it. It is what drives automatic delegation.
3. **`tools`:** the minimal list. A reviewer does not need to edit: `Read, Grep, Glob`. If you give it `Bash`, you cannot limit it to certain commands (that is what the `team-guard` hook is for).
4. **`model`:** `sonnet` for most; `opus` for reviews that require a lot of reasoning; `haiku` for simple searches.
5. **Instructions:** what to review (numbered list), how to answer (fixed format), and always «cite `file:line`» and «do not state what you did not read».
6. Restart the session, try it with a real task and adjust the `description` and the format based on what it returns.

## Exercises

Do the three in order, with material from your own repository.

### Exercise 1 — A security review

1. Ask: «use `db-security-reviewer` to review `backend/migrations/<latest>.sql` and its test».
2. Read the table. For two findings (or two statements in «What I reviewed»), open the file at the cited line and check whether it is true.
3. Look at «What I could not verify»: run `scripts/verify.sh backend` if it says so.
4. Ask yourself: what question would I ask a teammate who reviewed this? If the report does not answer it, improve the subagent's instructions.

### Exercise 2 — Finding the origin of a screen

1. Ask: «use `reference-explorer` to find the origin of <a screen> in the reference app (views, rules and exact texts)».
2. Check that the texts it returns are identical to the ones in the source file.
3. Now invoke the `reference-parity` skill with «compare <the screen> on <the other platform> with the reference»: you will see how a skill delegates the reading to a subagent and builds the table of differences.

### Exercise 3 — Two reviewers in parallel

Pick a change that touched both the contract (a new field in a schema) and the database (the function that stores it).

1. Ask: «launch in parallel `contract-reviewer` (on the schema and its fixtures) and `db-security-reviewer` (on the migration and its test)».
2. Compare the two reports: do they contradict each other? Did one see something the other could not? That is the value of separate reviews.
3. Decide which findings are real (checking the citations). By default they are fixed in this PR, as tasks. Only those the person decides to leave for later become a GitHub issue linked in the milestone plan (rule in `AGENTS.md`), not a note in the chat.

## Lessons from using them

- **Reports with verifiable citations are reliable;** a reviewer that paraphrases without `file:line` usually guesses.
- **Reviewers produce false positives:** a typical one is doubting that a constraint or function exists when it was defined in an earlier migration. That is why citations are checked.
- **«I could not verify X» is a task for you, not a finding.**
- **A generic agent with only `Read` has to guess paths;** subagents defined with `tools: Read, Grep, Glob` can search. If a reviewer asks for paths, give them in the brief.

## Repository rules about subagents

- Review subagents are read-only; those that write code are asked for explicitly and never overlap on the same files.
- A subagent never decides for you: it does not commit, open PRs or touch `main` or `dev` (`team-guard` enforces it).
- What a subagent states about the code is verified before repeating it in a plan or a PR.
