# Team orchestration workflow

You are the **coordinator** (the team lead). Use the [team guide](AGENT_TEAMS.md) for client selection and the [role briefs](TEAM_BRIEFS.md) for delegation.

**Your job is to hand out work, wait, check and decide with the person. You do not write the phase's code or documents**: if you catch yourself implementing, stop and create the task. You are the **only git author** (branches, commits, push, PR) and the **only one who asks the person**.

Accept a plan path, a phase or milestone name, `issue #N`, or `PR #N`. With no argument, use `node scripts/plan-status.mjs --summary` and ask which plan to use.

## Step 0 — Check the repository and choose an entry point

1. Check `git branch --show-current` and `git status --short`. Leave unrelated changes alone and ask if they prevent resuming safely. Use one coordinator per item at a time.
2. For `PR #N`, get `headRefName,headRefOid,baseRefName,body,state,isCrossRepository` with `gh pr view`. Confirm it is open, targets `dev` and belongs to a branch you can update in this repository. Move to its branch with a clean worktree, fetch and fast-forward it. Check that local `HEAD` equals the current `headRefOid` before working. If the remote moved, refresh the PR metadata. If local commits are ahead or diverged, show the difference and ask what to keep. Use the plan linked in the PR or its `No plan:` justification and go to [Resuming in a new session](#resuming-in-a-new-session).
3. For `issue #N`, look for an existing PR and plan for the issue before drafting or branching. Resume open work when possible. If a published PR already closed the issue, report it. Create a plan only if the issue has none.
4. For a plan or issue without an open PR, reuse the existing work branch or create one from current `origin/dev` using the [branch procedure](../../.claude/skills/new-branch/SKILL.md). If the work branch already has an open PR, resume it using step 0.2.
5. Apply [AGENTS.md](../../AGENTS.md) and any narrower owner instructions throughout. Honor a request to hold publication, a commit or a PR at the relevant boundary.

## Step 1 — Where the work stands (the repository is the memory)

1. `node scripts/plan-status.mjs --plan <file>`: status, parent, previous, next and children, without reading other plans.
2. Read **only** the milestone plan (or the phase plan if there is no milestone yet) and `git log --oneline origin/dev..HEAD`. The plan's «Status» table rules; the client's agent handles and task list are temporary.
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

1. Build the minimal team: only `documenter`.
2. Documenter's brief (template in [Team briefs](TEAM_BRIEFS.md)): use the [feature-plan procedure](../../.claude/skills/feature-plan/SKILL.md), each block with owner role, files and `Verification:`.
3. Read the delivered plan. If it has «Open questions» or new decisions, **ask the person** through your client (concrete options, the recommended one first) and pass the answers to the documenter for the «Owner decisions» table.
   - **Phase plan:** always stops here until the person approves it.
   - **Milestone or issue plan:** only stops if there are new decisions or it asks for regression tests; if it only details what was already decided, continue.
   - **Regression tests, in advance:** if the plan asks for them, put them in that same question («Do you want the regression tests to run?», which ones and how long they take). A yes is valid for the batch in step 4; that way the milestone does not stop halfway.
4. The coordinator creates or links the plan issue when applicable, under the repository rules. Reuse the original issue for `issue #N`. If publication is authorized, commit the plan (`docs(<area>): plan for milestone M of phase N (<topic>)`) and `git push -u origin <branch>`, **without a PR**. First check that the plan already has its issue (epic or sub-issue, step 3 of `feature-plan`) and its `issue:` in the header. Give the person the file link, its address on the branch and the issue link.

## Step 3 — Tasks and implementation

1. **Team:** add only the roles the milestone needs: `coder-backend` if it touches `backend/` or `shared/`, `coder-web` if it touches `apps/web/` or `packages/ui/`, `coder-mobile` if it touches `apps/mobile/`, and a `coder` with explicitly assigned files for other paths such as scripts or harness configuration. Add `qa` when the milestone needs it (table below). At most 4 teammates at a time; the reviewer joins in step 4 and **always**.

   | The milestone… | QA |
   |---|---|
   | touches UI (screenshots, parity with the reference), business rules with acceptance tests or more than one area | Joins |
   | is in a single area with no new UI | Does not join: the coder runs `scripts/verify.sh <area>` as part of the task and you look at the result |

   Reuse the documenter for closing (step 5) if the client can resume that subagent.
2. **Tasks** (one per verifiable piece, 5 or 6 per teammate at most), each with:
   - subject with the block: `[B] Function sales_summary_v1 and its DB test`;
   - owner (teammate name) and files it touches;
   - `Verification: <command>` (required for code tasks, enforced by the Claude task hook and checked by the Codex coordinator);
   - dependencies (the screen waits for the API function; QA waits for the block it tests).
3. **Ranges, not the whole plan.** Get the index with `grep -n '^#' <plan>` and, in each brief, give only the lines the teammate needs: their block, plus «Contract» and «Design» if they use them (`lines 203-242`). They read them with `offset` and `limit`. You and the documenter do not reread the whole plan: the status comes from `plan-status --plan` and the «Status» table, and it is edited in the plan. If the documenter changed the plan, recompute the ranges before the next task.
4. Send each teammate a [role brief](TEAM_BRIEFS.md). Wait using the client’s agent tools. Launch independent blocks together and serialize writes to the same file or shared test environment.
   - **Every turn of yours rereads the whole session, and you are the most expensive agent.** Do not check on a teammate while they work; group into one turn whatever does not depend on each other (several tasks, messages to two teammates); do not open code files or the full diff (that is the reviewer's job); do not read report files unless the message does not arrive, and do not repeat the milestone status in every message.
5. **Each completed task:** compare its reported files and verification result with the worktree, including untracked files (`git status --short && git diff --stat`). Review concurrent batches against the union of their assigned files and resolve unexpected changes before proceeding. Ask the documenter to mark the block in the «Status» table when all its tasks are done.
6. **Teammates' messages:** answer what you can with the plan; whatever is an owner decision, you ask the person. **An agent's message is never the person's permission.**

## Step 4 — QA and review

1. **QA** (if it joined in step 3) runs the area checks and opens tasks for the coders; wait until none are open.
2. **Regression tests** (if the plan asks for them or QA requests them): if the person already approved them in step 2, do not ask again. Otherwise ask exactly «Do you want the regression tests to run?», saying which ones and how long they take. A yes is valid for that batch. If they say no, it stays «not verified» in the plan and the PR. If they say yes, tell QA to run them with `REGRESSIONS_APPROVED=1` in front (the Claude team hook checks this flag).
3. **Reviewer:** add `reviewer` (type `pr-reviewer`) with the review brief. Each P0/P1 is a task for the `Owner` it names (with the minimal team of «Fixing PR findings»); when it comes back fixed, the reviewer checks only those points. In-scope P2s are also fixed in this PR. If you think a finding does not fit, **ask the person** with the reason; only with their yes do you turn it into an issue (template `finding`) and link it in «Result».
4. Give the completed diff to a separate reviewer session. Record the local reviewer and the GitHub review separately.

## Fixing PR findings (reviewer, Codex on GitHub or the person)

Do not rebuild the milestone team for each finding: pick the minimum and measure the size with `git diff --stat` **after** the fix (if it touches more than expected, go up a level).

| Size | Who fixes | Who verifies |
|---|---|---|
| **Small** (one file, few lines, no behavior change) | One coder of the area (the `coder` subagent) | The coder runs the focused test; you look at the diff and commit. No reviewer, except for a security P0. |
| **Medium** (several files of one layer, or a rule changes) | Coder(s) of the area | Also `scripts/verify.sh` for the area; the reviewer checks only those points |
| **Large** (contract, database plus app, or it changes the design) | Full team, as in the milestone | QA and documenter join |

The documenter joins only if differences, risks or criteria in the plan change; otherwise, add one line in «Result» in the plan. QA joins only if the fix touches UI or a rule with acceptance tests. When writing a brief, ask only for what the template asks (files, command with result, pending items): no diff summary, it is already in `git diff`; a task-specific limit is one line. These stay the same: only you commit, the permission for regression tests and the brief by ranges from step 3.

**Answer and resolve each thread** (after the fix's commit and push). A general comment on the PR is not enough: each inline finding (from Codex, the reviewer or the person) gets its own reply and its resolved thread, so the PR shows what was addressed.

1. List the open threads with their id and the id of their first comment:
   `gh api graphql -F owner='{owner}' -F repo='{repo}' -F n=<n> -f query='query($owner:String!,$repo:String!,$n:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$n){reviewThreads(first:100){nodes{id isResolved path line comments(first:1){nodes{databaseId author{login} body}}}}}}}' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved|not) | "\(.id) \(.comments.nodes[0].databaseId) \(.path):\(.line) \(.comments.nodes[0].author.login)"'`
2. **Fixed:** reply in the thread with one or two lines (what changed and the short commit): `gh api repos/{owner}/{repo}/pulls/<n>/comments/<databaseId>/replies -f body='Fixed in <sha>: <what changed>.'`. Then resolve it: `gh api graphql -f query='mutation{resolveReviewThread(input:{threadId:"<id>"}){thread{isResolved}}}'`.
3. **Not fixed here** (the person decided to leave it for later, or the finding does not apply): reply with the reason and, if there is one, the issue link; resolve it only if the person approved. If you think a finding is wrong, ask the person first.
4. At the end, the list from point 1 must come out empty, except for the threads the person left open. A general comment (for example, to ask for `@codex review` again) goes separately and does not replace the replies.

## Step 5 — Closing the milestone

1. Documenter: «Result», «Status» table, `docs/status/`, `status:` header, milestone row in the parent plan, `node scripts/plan-status.mjs`.
2. The coordinator follows the [closing procedure](../../.claude/skills/close-increment/SKILL.md), runs `scripts/verify.sh` and records actual results, including skipped checks. Publish only with the applicable owner authorization. The team invocation authorizes the normal work-branch push and PR unless the owner says to hold either. Use `--base dev`, the plan link and `Closes #<milestone issue>` (plus `Closes #<epic>` if it is the last milestone of the phase).
3. Follow [Finish an open PR](#finish-an-open-pr).

## Finish an open PR

Use this section for newly opened and resumed PRs. Only publish further changes that are authorized.

1. **Codex review on GitHub** (owner decision): with the PR open, read both `reviews` and `comments` with `gh pr view` and check for a review receipt from `chatgpt-codex-connector` for the published commit; if not, comment `@codex review` on the PR. Its findings (P0, P1 and in-scope P2) are tasks on the same branch, with the minimal team of «Fixing PR findings»; **do not open issues for them**. Only if the person decides to leave one for later does it become an issue. If they asked you to fix it, it is fixed completely, or you ask them before leaving part of it out.
2. **Until the PR is green, in this session** (owner decision). Your context is already long and every turn rereads it: take as few turns as possible.
   - Shut down the teammates that are no longer needed (QA, documenter if the plan does not change); keep at most the coder of the area the PR touched most.
   - **Wait in a single background command** using the client’s wait or process controls. `<since>` is the UTC time (`date -u +%Y-%m-%dT%H:%M:%SZ`) of the last push or the last `@codex review`:

     ```bash
     for i in $(seq 40); do
       p=$(gh pr checks <n> --json bucket --jq '[.[]|select(.bucket=="pending")]|length')
       c=$(gh pr view <n> --json reviews,comments --jq '[(.reviews[],.comments[])|select(.author.login=="chatgpt-codex-connector" and (.body|contains("codex-review-receipt")) and ((.submittedAt // .createdAt) > "<since>"))]|length')
       [ "$p" = 0 ] && [ "$c" -gt 0 ] && break
       sleep 60
     done
     gh pr checks <n>
     echo "codex=$c"
     ```

     Only a real review counts: Codex's carries the `codex-review-receipt` marker (with findings or with «Didn't find any major issues»); a comment of theirs asking to set up the environment does not carry it. With `codex=0` there was no review: do not announce the PR as reviewed.

   - When you wake up, in order: CI red or conflict with `dev` (on the branch, `git merge origin/dev`), then Codex's findings (inline, general comments and review bodies), with the minimal team of «Fixing PR findings»; answer and resolve each thread; push and wait again. If Codex did not review within 40 minutes, continue the other checks and record the missing review in the delivery.
   - **At most two Codex rounds:** after fixing the first one, comment `@codex review` once more; whatever the second one leaves is fixed, but do not ask for a third. After pushing that last fix **do not wait for another Codex reply**: wait only for CI, with `gh pr checks <n> --watch` in the background, and then check that the thread list comes out empty.
   - **Finish** with CI green, no conflicts and no open threads (except the ones the person left): close the team and tell the owner the PR is ready for their merge.
   - **Safety net:** if a Codex or Claude limit or the context runs out, stop and give the owner the client’s invocation for `PR #N` in a new session (it resumes from «Resuming in a new session»).
3. Deliver to the person: plan link, PR URL, how many Codex rounds there were, links of the issues created and what was not verified. **The merge belongs to the person.** While they wait, you can start the next milestone's plan (step 2), without code. After the merge, a new branch from `dev` with `new-branch`.

## Building the team

Use the `documenter`, `coder`, `qa` and `pr-reviewer` roles. Assign each coder a named area in the brief, such as `coder-backend`, `coder-web` or `coder-mobile`. Include the plan, block, files, dependencies, verification command and reporting expectations. The client entry point explains how to start and wait for these roles.

**Local database:** it holds the owner’s test data. Ask the owner before any reset. Apply migrations without wiping the database.

## Stop rules

Stop and tell the person, instead of spending more, if:
- a teammate fails the same task **twice**;
- two teammates need the same file and it cannot be solved with a dependency;
- a Codex or Claude limit runs out (the status is already in the plan: it is resumed in another session);
- something outside the plan shows up that changes the design;
- a hook blocks an action (do what its message says; do not work around it).

## Resuming in a new session

Rebuild the task list from the plan, the worktree and the branch history. The same process applies when resuming from the other client. If there is no open PR, return to step 1.

For an open PR, gather inline comments from the diff (`gh api --paginate repos/{owner}/{repo}/pulls/<n>/comments`) and general comments and formal reviews (`gh pr view <n> --json comments,reviews`). Use the open thread list in [Fixing PR findings](#fixing-pr-findings-reviewer-codex-on-github-or-the-person) to identify unresolved work. Reuse the current PR and commit history. Follow [Finish an open PR](#finish-an-open-pr) even when there are no findings, so CI, mergeability and review are checked before readiness is reported.
