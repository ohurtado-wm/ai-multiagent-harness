---
name: close-increment
description: Closes an increment of work: validates with scripts/verify.sh, adds the Result section to the plan, updates the status (docs/status, plan status header, plans table) and leaves the PR ready against dev with the plan link. Use it when you finish a milestone or block, or when someone says "close the milestone", "close the increment", "open the PR", "I'm done".
---

# Close an increment

Finish the work with the same shape every time. **Do not make up results**: every number and every statement comes from a run in this session.

## Steps

1. **Branch:** `git branch --show-current`. If it is `main` or `dev`, stop and use `new-branch` (the git hook will block the commit).
2. **Validate:** `scripts/verify.sh` (`auto` mode; `--list` first if you want to see what it will run). Record what came out `OK`, `FAIL` and `SKIPPED` and why. **A failure is not hidden or "fixed" by weakening a test**: fix the cause or report it. If there are areas `auto` does not cover (for example a native mobile app without its toolchain), say so. `verify.sh` and the focused tests run on their own; **regression tests (full UI or integration runs) do not: ask «Do you want the regression tests to run?» before launching them** (rule in `AGENTS.md`) and, if they are not run, record it under «What was not verified».
3. **Plan:** in the work's plan (`docs/plans/…`), move the blocks from `Pending` to `Done` (with notes like «Done; team validation missing») and add, before «Open questions», the section `## Result (YYYY-MM-DD)` with: what was built per layer with this session's test numbers, **Differences from the plan** and **What was not verified**. Format in the final comment of `.claude/skills/feature-plan/template.md`.
4. **Status:**
   - Plan header: `status: in-validation` if only the owner's part is missing (validation, remote environment, store submission), `closed` if nothing is missing, `in-progress` if your own work remains. If the parent plan is left with no children in progress, review its `status` too. If what comes next is known and has no plan yet, leave `next: <text>`.
   - The milestone row in the parent plan's table.
   - The area's file in `docs/status/`, with a new section at the top.
   - `node scripts/plan-status.mjs` to regenerate `docs/status/plans.md` («Now» section and tree); `node scripts/plan-status.mjs --plan <file>` confirms the plan's card.
   - `PROJECT_MAP.md` only if paths changed; the protocol document in `docs/architecture/` if the contract was clarified.
5. **Check documentation:** `scripts/verify.sh docs` (links and plans table).
6. **Commit:** only the increment's changes, with a `type(scope): summary` message and the co-author line the system indicates. If the work mixes two topics, propose two commits.
7. **PR — ask for confirmation first** before pushing and opening it: `git push -u origin <branch>` and `gh pr create --base dev` with a body that lists what was built, the tests run, **what was not verified**, the plan link and the issues created for findings that are not fixed here (rule in `AGENTS.md`). If the plan has `issue:` in its header, the body carries `Closes #<n>` (and also `Closes #<epic>` if it is the last milestone of the phase), and the same for each finding this PR fixes: GitHub closes them when merged into `dev`. If the branch is stacked on an unmerged PR, say so in the body. Then, **Codex review on GitHub**: if there is no review from `chatgpt-codex-connector` on the PR yet (`gh pr view <n> --json reviews`; a comment of theirs asking to set up the environment does not count), comment `@codex review`; its findings (P0, P1 and in-scope P2) are fixed on the same branch, with no issue. Each inline thread is answered with the fixing commit and resolved (commands in «Fixing PR findings» in the [shared team workflow](../../../docs/guides/TEAM_WORKFLOW.md#fixing-pr-findings-reviewer-codex-on-github-or-the-person)); a general comment does not replace that. Only if the person decides to leave one for later is its issue created (template `finding`), linked in the plan's «Result»; if you think it does not fit, ask them first.
8. **Delivery** (owner rule): the plan link (file with its relative path, as a Markdown link) and the PR URL, the links of the issues created and a three-line summary with what was not verified.

## Rules

- Never `--base main`, never merge or push to `dev`/`main`: promoting to `main` is done by a person.
- Do not close an increment with CI red: check `gh pr checks <n>` after pushing and fix it.
