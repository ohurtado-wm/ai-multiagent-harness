---
name: feature-plan
description: Creates the Markdown plan of a feature, milestone or phase with the repository's fixed structure and approach (status, owner decisions, design, blocks, tests, closing criteria, risks). Use it before implementing any feature (rule 4 of AGENTS.md), when someone says "write the plan", "plan milestone N", "plan this feature" or asks for the next item of a parent plan.
---

# Feature plan

Write the plan **before** implementing (rule 4 of `AGENTS.md`) and with the same shape every time, so everyone reads it the same way. The structure is in [`template.md`](template.md); this document says how to fill it in.

## Step 0 — Context (read, do not assume)

1. `AGENTS.md` and `PROJECT_MAP.md`: rules and paths. The real status of the area is in `docs/status/` (look it up; the summary is `docs/PROJECT_STATUS.md`).
2. **Where the plan goes:** `node scripts/plan-status.mjs --plan <parent plan>` gives its status, its children in order and which one is last; `--summary` gives what is in progress and what comes next. That way you know the `parent`, `previous` and `next` of the new plan without reading other plans.
3. The parent plan the work comes from (for example the milestone section in `docs/plans/<product>/phase-N/PLAN_PHASE_N_*.md`) and the **last sibling plan already written**: it is the reference for tone and detail.
4. The code and documents the feature touches: contracts (`shared/schemas/`), the functional reference (if any), domain logic, screens.
5. Git status: if previous work is still in an unmerged PR, warn before branching. Own branch from `dev` (`feature/phase-N-milestone-M-topic`); never to `main`. A phase and its first milestone share a branch.

Confirm what the plan states **by reading** (schemas, signatures, enums). If something in the parent plan does not match the code, say so in the plan.

## Step 1 — Owner decisions (ask before writing)

Before drafting, ask with `AskUserQuestion` (8 questions at most, concrete options, the recommended one first) **only** what changes the design and cannot be settled by reading: unclear scope, permissions, behavior in edge cases, what is deferred. Do not ask what the parent plan already decided or what has an obvious default (state it in the plan). The answers go into the «Owner decisions» table with the date.

## Step 2 — Write the plan

Path (by product, like the existing plans):
- Standalone plan: `docs/plans/<product>/PLAN_<TOPIC>.md`.
- Phases and milestones: `docs/plans/<product>/phase-N/PLAN_PHASE_N_MILESTONE_M_<TOPIC>.md` (or `PLAN_PHASE_N_<TOPIC>.md` for the phase).
- Harness changes: `docs/plans/harness/PLAN_<TOPIC>.md`.

Start with the header (the template has it) and follow [`template.md`](template.md) in this order: title and links, **Status**, goal and **out of this milestone**, **Owner decisions**, **Contract** (if there are messages or schemas), **Design**, **Blocks** (A, B, C…), **Tests**, **Closing criteria**, **Risks**, **Open questions**. The **Result** section is added at the end, not before.

### Header: status, parent, order

```
---
status: draft | approved | in-progress | in-validation | closed
parent: PLAN_OF_THE_PARENT.md
previous: PLAN_OF_THE_PREVIOUS_MILESTONE.md
next: PLAN_OF_THE_NEXT_MILESTONE.md   (or text, e.g. «Milestone 8: closing (no plan yet)»)
issue: 123                            (number of the plan's GitHub issue; see Step 3)
---
```

- **`status`:** `draft` (written, not approved) → `approved` → `in-progress` (being built) → `in-validation` (implemented; only the owner's part is missing: manual or team validation, applying to a remote environment, a store submission) → `closed` (the owner or the parent plan considers it done).
- **`parent`:** the larger plan it comes from (phase, extension or area plan). Every plan has one except the root plans. Children are not written: the script derives them.
- **`previous` and `next`:** only for milestones that form a sequence (milestone 1 → 2 → 3). They are reciprocal: when you write the plan of milestone N, add `next:` to the plan of milestone N−1 (and, if it said a text like «Milestone N (no plan yet)», replace it). Standalone improvements, adjustments and fixes only carry `parent`.
- **`issue`:** only the number of the plan's GitHub issue (no `#`).
- Plans are named by **file name**, unique in `docs/plans/`. `node scripts/plan-status.mjs` fails if a name does not exist, is repeated or the chain is not reciprocal.

Approach every plan must follow:

- **Size and parts (agents read the plan by line ranges):** aim for about 30 KB and at most 6 blocks per milestone plan. If the draft goes over, **split it into milestones with their own plan** (each with its branch and PR) before asking for approval. A single closing-criteria section (the others cite them by number), link instead of copying design that already lives in another plan or in `docs/architecture/`, and move lists that only the owner uses (manual checklist, migrations to apply) to a separate document. Each block is understandable on its own, so a teammate reads only theirs.
- **Explicit scope:** what is in and what is out, with the milestone where it arrives (no ambiguous gaps).
- **Ported UI, not redesigned:** if there are screens and the project has a functional reference, they are ported from it (same texts, order and rules); say so and name the source views.
- **A single source of rules:** shared domain logic is not rewritten per app; the business layer recomputes and does not trust the UI.
- **Parity:** expected results are computed **by hand** in the plan (tables with the numbers) and the test compares them with the code; if they disagree, find out who has the error.
- **Order-tolerant** when there are events or projections; the contract does not change without saying so.
- **Small blocks**, each with its verifiable; the last block is tests and documentation.
- **Lists and tables:** search, filters and sorting **in the database** (never only on screen), always in batches with the `total` and a way to fetch the next batch, without silent truncation, and a test with more than one batch.
- **Tests per layer:** fast (unit), contract conformance, integration against the local environment, UI, and **team validation**.
- **Numbered, checkable closing criteria**, not wishes.
- **Risks with their mitigation**, and personal or legal data flagged.
- **Do not duplicate documentation:** link to `docs/` instead of repeating. Plans **carry no dates or time estimates** (the date only appears in «Owner decisions» and «Result» as a record).
- English, no filler, in the tone of the existing plans.

## Step 3 — Close the plan

1. **GitHub issue** (rule in `AGENTS.md`; no need to ask). First search whether it exists (`gh issue list --search "<topic>" --state all`). The body is thin: two or three lines of goal and the link to the file on `dev` (`https://github.com/<owner>/<repo>/blob/dev/<path>`; valid even before merging, because that is where it will live).
   - **Phase plan → epic:** `gh issue create --title "<plan title>" --label epic --label enhancement --body "<goal>\n\nPlan: <link>"`.
   - **Milestone plan → sub-issue of the epic:** create it the same way (`--label enhancement`) and hang it from the phase epic: `gh api -X POST repos/<owner>/<repo>/issues/<epic>/sub_issues -F sub_issue_id=$(gh api repos/<owner>/<repo>/issues/<n> --jq .id)`.
   - **Standalone plan (harness, adjustment, fix):** an issue without an epic with `enhancement`, `bug` or `documentation`; if it hangs from a phase with an epic, also hang it as a sub-issue.
   - Put the number in the header (`issue: <n>`). Do not copy tasks, decisions or status to the issue: the real status lives in the plan header.
2. Check links and header: `node scripts/check-links.mjs` and `node scripts/plan-status.mjs` (regenerates `docs/status/plans.md`; fails if the header is inconsistent).
3. Commit on the work branch, only the plan: `docs(<area>): plan for milestone N of phase M (<topic>)`.
4. **Publish the branch, without opening a PR:** `git push -u origin <branch>`. The PR is opened when the milestone is done (skill `close-increment`): a documentation-only PR would trigger the whole CI without adding anything. Commit order for a phase: first the phase plan, then the milestone plan and then the implementation, all on the same branch (the first milestone's). Later milestones go on new branches from `dev` after merging.
5. **Always deliver the plan link for review** (owner rule, no exceptions), and the issue link: in the answer with the summary, and again every time you reply about that plan (changes, questions, approval). Put the repository file as a Markdown link with its relative path (file name as text and its path from the root as target) and its address on the published branch (`https://github.com/<owner>/<repo>/blob/<branch>/<path>`); once the PR exists, add its address (`https://github.com/<owner>/<repo>/pull/N`). If you changed the plan, say what changed before the link.
6. Show a short summary (goal, blocks, decisions) and start implementing **only if the person asked for it**; otherwise, ask.

## During and after implementing

- Keep the **Status** table up to date (Pending → Done, with notes like «Done; team validation missing») **and the milestones table of the parent plan** (the milestone row: link to the plan and status), which is the one read first.
- At the end add **Result (date)** with: what was built, **Differences from the plan**, **What was not verified** and the test numbers.
- Update the area's `docs/status/` file, the plan header (`status` and, if the order changed, `previous`/`next`) and the plans page (`node scripts/plan-status.mjs`); and `PROJECT_MAP.md` if paths change and, if the contract was clarified, the protocol document in `docs/architecture/`.
- The PR is opened when the milestone is done, targets `dev` and links the plan.
