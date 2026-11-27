# Briefs per role

Templates the coordinator fills in and sends to each teammate (or to Codex, through the coder). The teammate **does not see the coordinator's conversation**: if it is not in the brief, they do not know it. Fill in what is between `<…>` and delete the lines that do not apply.

**Report path:** every brief ends with `Final report also in <scratchpad>/reports/<name>.md`. The return channel accepts a single report per run, and reports that only travel through it get lost.

## documenter — plan

```
You are the team's documenter. Write the plan for <phase N | milestone M of phase N> with the feature-plan skill.
Parent plan: <docs/plans/<product>/phase-N/PLAN_…md>, section <…>. Last sibling plan as reference: <…>.
Each block must carry: owner role (coder-backend, coder-web, coder-mobile or qa), files it touches and a line «Verification: <command>».
If there is UI ported from the functional reference, name the source views (use reference-explorer) and compute the expected results by hand.
Whatever needs an owner decision goes to «Open questions» with options and your recommendation; do not ask yourself.
Your files: docs/**, PROJECT_MAP.md. No commits.
When done: check-links and plan-status --check green, mark the task and send me a summary with the open questions.
```

## documenter — closing

```
Milestone <M> is done. In <plan path>: «Status» table up to date, section «Result (<date>)» with what was built, differences from the plan, what was not verified and these test numbers: <command → result, one per line>.
Update docs/status/<area>.md, the status: header (<in-validation | closed>), the milestone row in <parent plan>, and run node scripts/plan-status.mjs. PROJECT_MAP.md only if paths changed: <yes/no>.
When done: verify.sh docs green and send me the list of files.
```

## coder — block

```
You are <coder-backend | coder-web | coder-mobile>. Your tasks: <ids or subjects>.
Plan: <path>, lines <a-b> (block <X>) and <c-d> (Contract or Design, if applicable). Read only those ranges (offset and limit), not the whole plan, and the AGENTS.md of your folder.
Your files: <globs>. Do not touch: <globs of the other coder, docs/**, generated files>.
Depends on: <task/teammate, or «nothing»>. If you need something from <other coder>, message them.
Delegate the code to Codex (codex:codex-rescue, --background --fresh --model gpt-6.1-sol --effort high) with the «Codex» template in briefs.md and wait for it as coder.md says (in the foreground with `status <id> --wait`, without ending your turn; no sleep loops and no relaunching while it runs). Check git status/diff and run the verification. If something fails, send it back to Codex with `--resume`; you do not edit code (coder.md, step 4).
Do not reset the local database (if you need a clean one, ask me). Seed test data the way the real flow does.
Verification of each task: <command>. Regression tests: no, unless I tell you the person agreed.
When closing each task: close whatever you left in the background, mark it and send me files changed, command and result, and pending items.
Final report also in <scratchpad>/reports/<name>.md.
```

## Codex — brief (written by the coder)

First line, always: `--background --fresh --model gpt-6.1-sol --effort high` (`--resume` instead of `--fresh` to fix the same work, never while the previous task is still running).

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

## qa — check

```
You are qa. Your tasks: <ids>. Plan: <path>, lines <a-b> (closing criteria <numbers>) and the blocks you test: <c-d>.
Diff areas: <docs, backend, web, …>: run scripts/verify.sh without areas (auto). Do not run tests of platforms the diff does not touch.
UI to verify: <screens and flow>, in light mode (verify-ui; dark only if the change touches colors or themes). Parity with: <reference views> (reference-parity).
Acceptance tests in: <folder>. Differences declared in the plan (they are not failures): <…>.
Each failure is a task for its owner (<names>) with reproduction and the broken criterion; message them.
Regression tests: ask me for them with which ones and how long they take; do not run them without my notice that the person agreed.
Test data: with the real flow's functions and in bulk; one integration run is enough. Do not reset the local database.
When done: shut down the servers, and report with command → OK/FAIL/SKIPPED, screenshots, open tasks and what was not verified.
Final report also in <scratchpad>/reports/qa.md.
```

## reviewer — milestone review

```
You are the reviewer (pr-reviewer). Review the diff of branch <branch> against origin/dev, plus whatever is uncommitted.
Codex wrote the code on behalf of the coders; your review is independent.
Milestone plan: <path>. Areas that change: <folders> (apply their Code Review Rules on top of those in AGENTS.md).
Ownership per role: coder-backend → <globs>, coder-web → <globs>, documenter → docs/**.
Call db-security-reviewer if there are migrations or SQL functions, and contract-reviewer if shared/schemas or shared/fixtures change.
Answer with the table Severity | Where | Finding | Suggestion | Owner, plus «What I reviewed» and «What I could not verify».
Final report also in <scratchpad>/reports/reviewer.md (with Bash).
```

## reviewer — second pass

```
These findings came back fixed: <list with file:line>. Check only those points in the current diff and say, for each one, whether it is resolved.
```
