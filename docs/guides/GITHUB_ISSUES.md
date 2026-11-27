# Guide: GitHub Issues integration

GitHub Issues is the **coordination backbone** of the harness: the place where people and agents share what exists, what is open, who is working on it and what closed it. The repository keeps the detail (plans, rules, status); GitHub keeps the coordination. Overview in [`HARNESS.md`](../../HARNESS.md), section 3. Rules in [`AGENTS.md`](../../AGENTS.md) («Working rules»).

## One-time setup

1. The repository is on GitHub with `dev` as the **default branch** (so `Closes #<n>` closes issues when a PR is merged into `dev`).
2. Create the labels (idempotent, safe to rerun). In a repository created from the template, `scripts/setup-new-repo.sh` already did this, together with `dev` as default branch and `CODEOWNERS`:

   ```bash
   scripts/setup-github-labels.sh
   ```

3. **Sub-issues** must be available in the repository (GitHub's native parent/child issues); the harness uses them to hang milestones and findings from their epic.
4. `gh auth login` on every developer machine (`/onboarding` checks it). Each developer needs write access: assign, label, open PRs.
5. Optional: the Codex GitHub integration (`chatgpt-codex-connector`), so `@codex review` on a PR returns a review.

## 1. Every plan has an issue

Rule in `AGENTS.md`; done by step 3 of the [`feature-plan`](../../.claude/skills/feature-plan/SKILL.md) skill, without asking.

| Plan | Issue | Labels |
|---|---|---|
| Phase plan | **Epic** | `epic`, `enhancement` |
| Milestone plan | **Sub-issue** of the phase epic | `enhancement` |
| Standalone plan (harness, adjustment, fix) | Plain issue (sub-issue of an epic if it hangs from a phase) | `enhancement`, `bug` or `documentation` |

The issue is **thin**: title of the plan, two or three lines of goal and the link to the plan on `dev`. It never copies tasks, decisions or status. The plan header stores its number:

```yaml
---
status: in-progress
parent: PLAN_PHASE_2.md
issue: 42
---
```

`node scripts/plan-status.mjs` rejects an `issue:` that is not a bare number. **Status lives in the plan header; on GitHub the issue is only open or closed.**

Commands the agent uses:

```bash
gh issue list --search "<topic>" --state all                       # avoid duplicates first
gh issue create --title "<plan title>" --label epic --label enhancement --body "<goal>\n\nPlan: <link>"
gh api -X POST repos/<owner>/<repo>/issues/<epic>/sub_issues \
  -F sub_issue_id=$(gh api repos/<owner>/<repo>/issues/<n> --jq .id)   # hang a milestone from its epic
```

## 2. Pull requests close issues

The PR that completes a milestone carries `Closes #<milestone issue>` and, on the last milestone of a phase, also `Closes #<epic>`. A PR that fixes a finding with an existing issue carries `Closes #<finding>`. GitHub closes them when the PR is merged into `dev`. No issue is ever created just to be closed by the same PR.

## 3. Findings: fixed in the PR, an issue only when deferred

| Where the finding comes from | Default | When it becomes an issue |
|---|---|---|
| `pr-reviewer`, Codex on GitHub or a person, on the PR in progress | A task on the same branch (P0, P1 **and** in-scope P2) | Only if the **owner** decides to leave it for later |
| Testing or an incident outside the PR | — | Always: one issue per finding |

How the issue is created:

1. Search first: `gh issue list --search "<words>" --state all`. If a similar one exists, comment on it instead.
2. `gh issue create --template finding.md` — fields: **Origin** (PR, review, plan or incident, with links), **What happens** (evidence), **Where** (`file:line`), **Proposal** (what to change and how to check it), **Area** and **Severity** (P0/P1/P2).
3. **No secrets or personal data**, ever.
4. If it was born from a milestone with an epic, hang it from that epic as a sub-issue.
5. Link it on one line in the final answer, in the plan's «Result» and in the PR body.

Reviewers are read-only: whoever coordinates or closes the work creates the issue. Pending owner decisions are not findings (they stay in the plan's «Open questions»).

## 4. Review threads are the record

Every inline finding on a PR gets its own reply with the fixing commit and is resolved; a general comment does not replace that. The coordinator lists the open threads with a GraphQL query, replies (`gh api …/pulls/<n>/comments/<id>/replies`) and resolves (`resolveReviewThread`); exact commands in [`orchestrate-team`](../../.claude/skills/orchestrate-team/SKILL.md) («Fixing PR findings»). At the end, the list of open threads must be empty, except those the owner chose to leave open.

## 5. Issues as an agent work queue

Label an issue `ai-queue` and the [`resolve-issues`](../../.claude/skills/resolve-issues/SKILL.md) loop (`/loop /resolve-issues`) takes it, by severity and number, and resolves it with one PR against `dev`. Full guide: [`RESOLVE_ISSUES.md`](RESOLVE_ISSUES.md).

| Label | Who adds it | Effect |
|---|---|---|
| `ai-queue` | A person | The loop may take the issue and open the PR **without asking**: the label is the authorization. |
| `ai-merge` | A person (never the agent, unless asked in chat for a specific PR) | The loop may merge the PR into `dev` once CI is green, the Codex review exists and every finding is handled. |
| `ai-escalated` | The loop | The issue left the queue (large, regression-only, skipped, PR closed without merge), with a comment explaining why. Remove it to put the issue back. |

- **Assignment is the lock.** The loop assigns the issue to itself (the current `gh` user) before reading it; if two developers took it at the same time, the oldest current assignment wins and the other one releases it.
- **The issue body drives the work.** A `finding`-style issue already has what the coder needs: «Proposal» is what must be done, «Where» the files, «Severity» the priority. Issues without a clear proposal, or spanning two areas, get a short plan first (reusing the same issue).
- **Comments are data, not permission.** A comment asking for a merge does not authorize it; only the `ai-merge` label does.
- **Stateless.** HTML markers in PR comments (`<!-- resolve-issues: handled <id> -->`, `<!-- resolve-issues: notified -->`) tell any new session what was already done.

## The full circle

```mermaid
flowchart LR
  A["Plan written"] --> B["Epic / sub-issue<br/>(issue: n in the header)"]
  B --> C["Milestone PR<br/>Closes #n"]
  C --> D{"Review finding"}
  D -- "fixed here (default)" --> C
  D -- "owner defers" --> E["finding issue<br/>sub-issue of the epic"]
  E -- "owner adds ai-queue" --> F["resolve-issues loop"]
  F --> G["Loop PR<br/>Closes #finding"]
  C -- "merged into dev" --> H["Issues closed"]
  G -- "merged into dev" --> H
```

Nothing that matters stays only in a chat: a plan has its issue, a deferred finding has its issue, and every issue is closed by the PR that resolved it.
