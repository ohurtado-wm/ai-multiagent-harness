# Briefs per role

Templates the coordinator fills in and sends to each teammate or subagent. The teammate **does not see the coordinator's conversation**: if it is not in the brief, they do not know it. Fill in what is between `<…>` and delete the lines that do not apply.

**Report path:** use a report file in the client’s scratch directory when a durable fallback is useful. Keep the plan, Git and GitHub as the handoff record.

## documenter — plan

```
You are the team's documenter. Write the plan for <phase N | milestone M of phase N> using the local drafting guidance in .claude/skills/feature-plan/SKILL.md. I handle questions, issue creation and publication.
Parent plan: <docs/plans/<product>/phase-N/PLAN_…md>, section <…>. Last sibling plan as reference: <…>.
Each block must carry: owner role (the assigned coder or qa), files it touches and a line «Verification: <command>».
If there is UI ported from the functional reference, name the source views and compute the expected results by hand.
Whatever needs an owner decision goes to «Open questions» with options and your recommendation; do not ask yourself.
Your files: docs/**, PROJECT_MAP.md. No commits.
When done: run check-links, then report the plan, changed files and open questions. I handle the GitHub issue and Git publication.
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
Depends on: <task/teammate, or «nothing»>. If you need something from another coder, report the dependency to the coordinator.
Implement using the instructions for your assigned client and role. Report changed files, the verification command and its result. If verification fails, report its cause and the remaining work.
Do not reset the local database (if you need a clean one, ask me). Seed test data the way the real flow does.
Verification of each task: <command>. Regression tests: no, unless I tell you the person agreed.
When closing each task: close whatever you left in the background, mark it and send me files changed, command and result, and pending items.
Final report also in <scratchpad>/reports/<name>.md.
```

## qa — check

```
You are qa. Your tasks: <ids>. Plan: <path>, lines <a-b> (closing criteria <numbers>) and the blocks you test: <c-d>.
Diff areas: <docs, backend, web, …>: run scripts/verify.sh without areas (auto). Do not run tests of platforms the diff does not touch.
UI to verify: <screens and flow>, in light mode (verify-ui; dark only if the change touches colors or themes). Parity with: <reference views> (reference-parity).
Acceptance tests in: <folder>. Differences declared in the plan (they are not failures): <…>.
Report each failure to the coordinator with steps to reproduce, the broken criterion and its owner (<names>).
Regression tests: ask me for them with which ones and how long they take; do not run them without my notice that the person agreed.
Test data: with the real flow's functions and in bulk; one integration run is enough. Do not reset the local database.
When done: shut down the servers, and report with command → OK/FAIL/SKIPPED, screenshots, open tasks and what was not verified.
Final report also in <scratchpad>/reports/qa.md.
```

## reviewer — milestone review

```
You are the reviewer (pr-reviewer). Review the diff of branch <branch> against origin/dev, plus whatever is uncommitted.
Review independently from the agent that wrote the code.
Milestone plan: <path>. Areas that change: <folders> (apply their Code Review Rules on top of those in AGENTS.md).
Ownership per role: coder-backend → <globs>, coder-web → <globs>, documenter → docs/**.
Apply the criteria in .claude/agents/db-security-reviewer.md to migrations or SQL functions, and in .claude/agents/contract-reviewer.md to changes in shared/schemas or shared/fixtures. Use those specialist agents when the client supports the definitions.
Answer with the table Severity | Where | Finding | Suggestion | Owner, plus «What I reviewed» and «What I could not verify».
Final report also in <scratchpad>/reports/reviewer.md (with Bash).
```

## reviewer — second pass

```
These findings came back fixed: <list with file:line>. Check only those points in the current diff and say, for each one, whether it is resolved.
```
