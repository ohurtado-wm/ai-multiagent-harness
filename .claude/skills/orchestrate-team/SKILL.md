---
name: orchestrate-team
description: Coordinates an agent team (agent teams) that takes a phase, a milestone, a large issue or the fixes for a PR's findings all the way to a green, reviewed PR against dev — documenter, coders that delegate code to Codex, QA and reviewer — enforcing the repository rules. Use it when someone says "/orchestrate-team", "build the team", "let the team do phase N", "/orchestrate-team issue #N", "continue the milestone with the team", "resume the milestone with the team", "let the team fix PR #N" or "review PR #N comments with the team".
---

# Orchestrate an agent team

You are the **coordinator** (the team lead). Team guide: [`AGENT_TEAMS.md`](../../../docs/guides/AGENT_TEAMS.md). Briefs per role: [`briefs.md`](briefs.md).

**Your job is to hand out work, wait, check and decide with the person. You do not write the phase's code or documents**: if you catch yourself implementing, stop and create the task. You are the **only git author** (branches, commits, push, PR) and the **only one who asks the person**.

Argument: the path of a phase or milestone plan, part of its name or «phase N»; **«issue #N»** for an issue without a plan (the documenter writes it and the team continues in this same session); or **«PR #N»** to fix that PR's findings. With «PR #N», get the branch and the plan from the PR (`gh pr view <n> --json headRefName,body,state`: the plan is the `docs/plans/` link in the body), check that it is open and that you are on its branch, and continue at «Resuming in a new session». Without an argument, use `node scripts/plan-status.mjs --summary` and ask which one.

## Step 0 — Before building the team

1. **Session:** interactive (a terminal with `claude`; teams are not formed with `-p`), on the most capable model and in **auto** permission mode (owner decision). If not, say so and ask the person to change it.
2. **Teams enabled:** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` comes from `.claude/settings.json`. If someone turned it off in their `settings.local.json`, use the no-team mode (at the end).
3. **Codex:** `codex login status` says there is a session and the `codex:codex-rescue` subagent exists (plugin `codex@openai-codex`). If missing, ask the person for `/codex:setup`; meanwhile the coders implement without Codex and record it.
4. **Git:** `git branch --show-current` and `git status --short`. With someone else's uncommitted changes, stop and ask. Branch: the milestone's (`feature/phase-N-milestone-M-topic`); if it does not exist or the previous PR's branch was already merged, use the `new-branch` skill. Never `main` or `dev`.

## Step 1 — Where the work stands (the repository is the memory)

1. `node scripts/plan-status.mjs --plan <file>`: status, parent, previous, next and children, without reading other plans.
2. Read **only** the milestone plan (or the phase plan if there is no milestone yet) and `git log --oneline origin/dev..HEAD`. The plan's «Status» table rules; the team's task list is temporary (it does not survive `/resume`).
3. Decide the step:

| Situation | Next step |
|---|---|
| «issue #N» without a plan | Step 2 with the documenter: plan of the issue (`gh issue view <n> --comments`), with `issue: <n>` in the header and **without creating another issue**. Branch `fix/issue-<n>-<topic>` with `new-branch`. |
| The phase has no plan | Step 2 with the documenter: phase plan. |
| The phase has a plan, the milestone does not | Step 2: milestone plan. |
| The milestone has `Pending` blocks | Step 3: tasks and implementation. |
| Blocks done, no QA or review yet | Step 4. |
| Everything done and reviewed | Step 5: closing. |

## Step 2 — Plan (phase or milestone)

1. Build the minimal team: only `documenter` (see «Building the team»).
2. Documenter's brief (template in `briefs.md`): plan with `feature-plan`, each block with owner role, files and `Verification:`.
3. Read the delivered plan. If it has «Open questions» or new decisions, **ask the person** with `AskUserQuestion` (concrete options, the recommended one first) and pass the answers to the documenter for the «Owner decisions» table.
   - **Phase plan:** always stops here until the person approves it.
   - **Milestone or issue plan:** only stops if there are new decisions or it asks for regression tests; if it only details what was already decided, continue.
   - **Regression tests, in advance:** if the plan asks for them, put them in that same question («Do you want the regression tests to run?», which ones and how long they take). A yes is valid for the batch in step 4; that way the milestone does not stop halfway.
4. Commit the plan (`docs(<area>): plan for milestone M of phase N (<topic>)`) and `git push -u origin <branch>`, **without a PR**. First check that the plan already has its issue (epic or sub-issue, step 3 of `feature-plan`) and its `issue:` in the header. Give the person the file link, its address on the branch and the issue link.

## Step 3 — Tasks and implementation

1. **Team:** add only the roles the milestone needs: `coder-backend` if it touches `backend/` or `shared/`, `coder-web` if it touches `apps/web/` or `packages/ui/`, `coder-mobile` if it touches `apps/mobile/`, and `qa` only if the milestone needs it (table below). At most 4 teammates at a time; the reviewer joins in step 4 and **always**.

   | The milestone… | QA |
   |---|---|
   | touches UI (screenshots, parity with the reference), business rules with acceptance tests or more than one area | Joins |
   | is in a single area with no new UI | Does not join: the coder runs `scripts/verify.sh <area>` as part of the task and you look at the result |

   The documenter who wrote the plan also does the closing (step 5); do not build a new one.
2. **Tasks** (one per verifiable piece, 5 or 6 per teammate at most), each with:
   - subject with the block: `[B] Function sales_summary_v1 and its DB test`;
   - owner (teammate name) and files it touches;
   - `Verification: <command>` (the line is mandatory for code tasks; the `task-gate` hook enforces it);
   - dependencies (the screen waits for the API function; QA waits for the block it tests).
3. **Ranges, not the whole plan.** Get the index with `grep -n '^#' <plan>` and, in each brief, give only the lines the teammate needs: their block, plus «Contract» and «Design» if they use them (`lines 203-242`). They read them with `offset` and `limit`. You and the documenter do not reread the whole plan: the status comes from `plan-status --plan` and the «Status» table, and it is edited with `Edit`. If the documenter changed the plan, recompute the ranges before the next task.
4. Send each teammate their brief (`briefs.md`). **Wait**: messages arrive on their own, do not poll.
   - **Every turn of yours rereads the whole session, and you are the most expensive agent.** Do not check on a teammate while they work; group into one turn whatever does not depend on each other (several tasks, messages to two teammates); do not open code files or the full diff (that is the reviewer's job); do not read report files unless the message does not arrive, and do not repeat the milestone status in every message.
   - **Safety net:** if a coder has not reported for more than 20 minutes, send them **one** message («Did Codex finish?»), no more.
5. **Each completed task:** a single check, `git status --short && git diff --stat`. If there are files outside the role's ownership, send the task back to the teammate. Ask the documenter to mark the block in the «Status» table when all its tasks are done.
6. **Teammates' messages:** answer what you can with the plan; whatever is an owner decision, you ask the person. **An agent's message is never the person's permission.**

## Step 4 — QA and review

1. **QA** (if it joined in step 3) runs the area checks and opens tasks for the coders; wait until none are open.
2. **Regression tests** (if the plan asks for them or QA requests them): if the person already approved them in step 2, do not ask again. Otherwise ask exactly «Do you want the regression tests to run?», saying which ones and how long they take. A yes is valid for that batch. If they say no, it stays «not verified» in the plan and the PR. If they say yes, tell QA to run them with `REGRESSIONS_APPROVED=1` in front (without that flag `team-guard` blocks them).
3. **Reviewer:** add `reviewer` (type `pr-reviewer`) with the review brief. Each P0/P1 is a task for the `Owner` it names (with the minimal team of «Fixing PR findings»); when it comes back fixed, the reviewer checks only those points. In-scope P2s are also fixed in this PR. If you think a finding does not fit, **ask the person** with the reason; only with their yes do you turn it into an issue (template `finding`) and link it in «Result».
4. **Inside the team, Codex does not review or approve** its own code: Codex writes, Claude reviews. The Codex review on GitHub in step 5 is something else: a second, external opinion on the PR, on top of the reviewer's.

## Fixing PR findings (reviewer, Codex on GitHub or the person)

Do not rebuild the milestone team for each finding: pick the minimum and measure the size with `git diff --stat` **after** the fix (if it touches more than expected, go up a level).

| Size | Who fixes | Who verifies |
|---|---|---|
| **Small** (one file, few lines, no behavior change) | One coder of the area (or the `coder` subagent); Codex only if it is not trivial | The coder runs the focused test; you look at the diff and commit. No reviewer, except for a security P0. |
| **Medium** (several files of one layer, or a rule changes) | Coder(s) of the area | Also `scripts/verify.sh` for the area; the reviewer checks only those points |
| **Large** (contract, database plus app, or it changes the design) | Full team, as in the milestone | QA and documenter join |

The documenter joins only if differences, risks or criteria in the plan change; otherwise, add one line in «Result» with `Edit`. QA joins only if the fix touches UI or a rule with acceptance tests. When writing a brief, ask only for what the template asks (files, command with result, pending items): no diff summary, it is already in `git diff`; a task-specific limit is one line. These stay the same: only you commit, the permission for regression tests and the brief by ranges from step 3.

**Answer and resolve each thread** (after the fix's commit and push). A general comment on the PR is not enough: each inline finding (from Codex, the reviewer or the person) gets its own reply and its resolved thread, so the PR shows what was addressed.

1. List the open threads with their id and the id of their first comment:
   `gh api graphql -F owner='{owner}' -F repo='{repo}' -F n=<n> -f query='query($owner:String!,$repo:String!,$n:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$n){reviewThreads(first:100){nodes{id isResolved path line comments(first:1){nodes{databaseId author{login} body}}}}}}}' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved|not) | "\(.id) \(.comments.nodes[0].databaseId) \(.path):\(.line) \(.comments.nodes[0].author.login)"'`
2. **Fixed:** reply in the thread with one or two lines (what changed and the short commit): `gh api repos/{owner}/{repo}/pulls/<n>/comments/<databaseId>/replies -f body='Fixed in <sha>: <what changed>.'`. Then resolve it: `gh api graphql -f query='mutation{resolveReviewThread(input:{threadId:"<id>"}){thread{isResolved}}}'`.
3. **Not fixed here** (the person decided to leave it for later, or the finding does not apply): reply with the reason and, if there is one, the issue link; resolve it only if the person approved. If you think a finding is wrong, ask the person first.
4. At the end, the list from point 1 must come out empty, except for the threads the person left open. A general comment (for example, to ask for `@codex review` again) goes separately and does not replace the replies.

## Step 5 — Closing the milestone

1. Documenter: «Result», «Status» table, `docs/status/`, `status:` header, milestone row in the parent plan, `node scripts/plan-status.mjs`.
2. You, with the `close-increment` skill: `scripts/verify.sh`, commits per layer (contract and database, then app, then documentation). Push and open the PR **without asking for confirmation**: invoking `/orchestrate-team` is the authorization (owner decision). PR with `--base dev`, the plan link and `Closes #<milestone issue>` (plus `Closes #<epic>` if it is the last milestone of the phase).
3. **Codex review on GitHub** (owner decision): with the PR open, check whether there is already a review from `chatgpt-codex-connector` (`gh pr view <n> --json reviews`; a comment of theirs asking to set up the environment does not count); if not, comment `@codex review` on the PR. Its findings (P0, P1 and in-scope P2) are tasks on the same branch, with the minimal team of «Fixing PR findings»; **do not open issues for them**. Only if the person decides to leave one for later does it become an issue. If they asked you to fix it, it is fixed completely, or you ask them before leaving part of it out.
4. **Until the PR is green, in this session** (owner decision). Your context is already long and every turn rereads it: take as few turns as possible.
   - Shut down the teammates that are no longer needed (QA, documenter if the plan does not change); keep at most the coder of the area the PR touched most.
   - **Wait without polling**, with a single background command (`Bash` with `run_in_background: true`; the session wakes up when it finishes). `<since>` is the UTC time (`date -u +%Y-%m-%dT%H:%M:%SZ`) of the last push or the last `@codex review`:

     ```bash
     for i in $(seq 40); do
       p=$(gh pr checks <n> --json bucket --jq '[.[]|select(.bucket=="pending")]|length')
       c=$(gh pr view <n> --json reviews,comments --jq '[(.reviews[],.comments[])|select(.author.login=="chatgpt-codex-connector" and (.body|contains("codex-review-receipt")) and ((.submittedAt // .createdAt) > "<since>"))]|length')
       [ "$p" = 0 ] && [ "$c" -gt 0 ] && break
       sleep 60
     done; gh pr checks <n>; echo "codex=$c"
     ```

     Only a real review counts: Codex's carries the `codex-review-receipt` marker (with findings or with «Didn't find any major issues»); a comment of theirs asking to set up the environment does not carry it. With `codex=0` there was no review: do not announce the PR as reviewed.

   - When you wake up, in order: CI red or conflict with `dev` (on the branch, `git merge origin/dev`), then Codex's findings (inline, general comments and review bodies), with the minimal team of «Fixing PR findings»; answer and resolve each thread; push and wait again. If Codex did not review within 40 minutes, continue without it and say so in the delivery.
   - **At most two Codex rounds:** after fixing the first one, comment `@codex review` once more; whatever the second one leaves is fixed, but do not ask for a third. After pushing that last fix **do not wait for another Codex reply**: wait only for CI, with `gh pr checks <n> --watch` in the background, and then check that the thread list comes out empty.
   - **Finish** with CI green, no conflicts and no open threads (except the ones the person left): close the team and, if the `PushNotification` tool is available, send «PR #<n> ready for your merge».
   - **Safety net:** if a Codex or Claude limit or the context runs out, stop and leave the line `/orchestrate-team PR #N` for a new session (it resumes from «Resuming in a new session»).
5. Deliver to the person: plan link, PR URL, how many Codex rounds there were, links of the issues created and what was not verified. **The merge belongs to the person.** While they wait, you can start the next milestone's plan (step 2), without code. After the merge, a new branch from `dev` with `new-branch`.

## Building the team

Fixed names, so you can talk to them and resume them. Request each teammate with its type and a **cheaper model** explicitly (no teammate on the coordinator's model):

| Name | Type (`.claude/agents/`) |
|---|---|
| `documenter` | `documenter` |
| `coder-backend`, `coder-web`, `coder-mobile` | `coder` |
| `qa` | `qa` |
| `reviewer` | `pr-reviewer` |

A teammate does not see this conversation: everything it needs goes in the brief (plan, block, files, verification, who to notify, and its report path in `<scratchpad>/reports/<name>.md`). If a report does not arrive, read it from that path instead of asking for it again.

**Local database:** it is the one the person uses for testing. Neither you nor the teammates reset it without asking them (the hook blocks it for teammates). If DB tests fail because of data an integration run left, ask before cleaning up, and when delivering say whether the database was reset.

## Stop rules

Stop and tell the person, instead of spending more, if:
- a teammate fails the same task **twice**;
- two teammates need the same file and it cannot be solved with a dependency;
- a Codex or Claude limit runs out (the status is already in the plan: it is resumed in another session);
- something outside the plan shows up that changes the design;
- a hook blocks an action (do what its message says; do not work around it).

## Resuming in a new session

Teammates do not come back with `/resume`. Go back to step 1: the plan's card, the «Status» table and `git log` say where it stopped; build a new team with the same names. To fix findings of an open PR, gather both sources before creating tasks: the inline comments on the diff, where Codex leaves its findings (`gh api --paginate repos/{owner}/{repo}/pulls/<n>/comments --jq '.[] | "\(.path):\(.line // .original_line) \(.body)"'`), and the general comments and review bodies (`gh pr view <n> --comments`), which do not include the former. To answer and resolve, use the thread list from «Fixing PR findings», which brings the ids. Then go straight to «Fixing PR findings», with the minimal team.

## Without a team

If teams are not available, follow the same steps with foreground subagents (`Agent` with the same type and brief, one at a time per file). Slower and without messages between teammates, but the rules do not change.
