# Guide: letting the AI resolve issues one at a time

How to delegate GitHub issues to the `resolve-issues` loop, which opens one PR per issue against `dev` and waits for your merge before the next one (or merges it itself, only if you ask it to). Skill: [`.claude/skills/resolve-issues/SKILL.md`](../../.claude/skills/resolve-issues/SKILL.md).

## When it is worth it

| To the loop (`resolve-issues`) | To the team (`/orchestrate-team`) or a normal session |
|---|---|
| Bugs and small improvements in one area, with a clear «Proposal» in the issue. | Milestones, phases and what is really large: more than two areas, shared contracts, new UI ported from the reference. |
| Issues **with plan**: two areas (an API function and its client), no clear «Proposal» or a decision of yours. The loop writes a short plan and resolves it in the same session. | What can *only* be verified with regression tests (full simulator or integration runs): a normal session. |
| Verified with fast or focused tests (the regression tests of an issue with plan are asked together with the plan). | |

If the loop finds a large issue, it asks you where to send it. If it goes to the team, the line is just one: `/orchestrate-team issue #N`.

**Issue with plan:** the loop writes the plan (it reuses the issue, it does not create another one) and asks you only if the plan leaves open questions or needs regression tests, all in a single question. Otherwise it continues and you review the plan in the PR. To put back in the queue an issue that was left out before as «large», remove `ai-escalated`.

## Usage

1. **Queue:** add the `ai-queue` label to each issue you want to delegate. Only those are taken, by severity (P0, P1, P2) and then by number.
2. **Start:** in a Claude Code session at the repository root, without your own uncommitted changes (untracked files do not count):

   ```
   /loop /resolve-issues
   ```

   With `/resolve-issues #N` it takes that issue first.
3. **Your part:** review and **merge** each PR into `dev`. The loop first handles the Codex review on GitHub and CI; it opens the PR without asking you, because the label already is your authorization.
   **Merge on request:** if you want the loop to merge, also add `ai-merge`: to the issue when queueing it (it merges without waiting for you) or to the PR once you reviewed it. It only merges into `dev`, with CI green, the Codex review done and handled and no conflicts; if something is missing, it waits for your merge as always. Without `ai-merge` it never merges, even if you ask in a GitHub comment.
4. **Cut:** before taking a new issue, the loop measures its own context. If it goes over 250,000 tokens or it already merged 5 PRs, it stops and proposes a new session with `/loop /resolve-issues`, which you start with a click. Every turn rereads everything accumulated, so continuing in a long session costs more than starting another one: in the measurements behind these limits, the tokens re-read per issue grew from 14.5M to 21M to 28M within one session, while a session starts at ~85k and each issue adds 45–50k with the short-context rules (4 or 5 issues before 250k). Details in [`HARNESS.md`](../../HARNESS.md), «The issue loop». These limits were measured on one project and should be **calibrated per repository**: in a small project each issue adds less context, so more PRs fit before the cut. Change them in the skill («Cut», step 5). Outside the desktop app it cannot measure it and cuts every 3 PRs (an issue with plan counts as two). After a cut, do not run `/loop` again in that same session: use the new one.

## When it asks or stops

| Moment | What happens |
|---|---|
| An issue is large | It asks you: team with its own plan, resolve it here or skip it. Until you answer, the loop waits. |
| The fix grew more than expected | It stops before the PR and asks you. |
| The fix or CI fail twice, a hook blocks it, a limit runs out or there are unrelated uncommitted changes | It stops and tells you. |
| You close a PR without merging | It marks the issue `ai-escalated` and stops so you say why. |
| A PR is ready for your merge | It sends you a notification (if the app allows it) and asks: «I already merged it» (it continues with the next issue right away), «Merge it yourself» (it merges it as with `ai-merge`) or «Wait» (it does not ask about that PR again and checks every ~30 minutes). If the PR already has `ai-merge`, it does not ask: it merges it. |
| The session's context grew or there are already 5 PRs | It cuts and proposes the next session (point 4 of «Usage»). |
| A merge on request fails | It stops and tells you; it does not retry it by skipping branch protection. |

## Issues the loop leaves out

It marks them with `ai-escalated` and a comment with the reason (regression tests, escalated to the team, skipped or PR closed without merging). To put one back in the queue, remove `ai-escalated` (and keep `ai-queue`). If it left because of a PR closed without merging, the loop already removed `ai-queue` from that PR and will not count it again.

## Several developers

Each developer can run their own loop on their machine, with their GitHub account:

- **The issue is assigned to whoever takes it.** On GitHub you can see who is working on each one. The loop skips issues assigned to someone else, even if they have been days without a PR: to release an abandoned one, remove the assignment.
- **Each loop only handles its own PRs.** Each developer waits for their merge before taking the next one; both move forward in parallel, and if their PRs collide on `dev`, whoever merges second resolves the conflict on their branch.
- **If two take the same issue at the same time,** whoever was assigned first wins; the other removes their assignment and takes the next one.
- **The questions of a short plan** are answered by whoever runs the loop, and they stay in the plan's «Owner decisions».
- **One session per developer:** with the same account, the loop cannot tell two of your sessions apart.
- Each developer needs write permission on the repository (assigning, labeling, opening PRs) and their own Codex session.

## Stopping it

Write in the session that it should stop, or close it. When you run `/loop /resolve-issues` again, it resumes from GitHub: the open queue PR or the next issue.
