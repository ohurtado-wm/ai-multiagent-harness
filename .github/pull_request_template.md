## What changes

<!-- Short summary: what was built or fixed and why. -->

## Plan

<!-- Link to the plan in docs/plans/ (rule 4). If it is a minor fix without a plan, write on one line: No plan: <reason> -->
<!-- If the plan has a GitHub issue, or the PR fixes a finding with an issue: Closes #<n> (one per line). -->

Closes #

## Validation

<!-- What you ran (scripts/verify.sh …) and the result. Record what was SKIPPED or not verified. -->

## Checklist

- [ ] The PR base is `dev` (never `main`).
- [ ] There is a plan linked in `docs/plans/`, or the line `No plan: <reason>`.
- [ ] The area's `docs/status/`, the plan header (`status`, `parent`, `previous`, `next`) and `docs/status/plans.md` (`node scripts/plan-status.mjs`) are up to date.
- [ ] I ran `scripts/verify.sh` and wrote above what was not verified.
- [ ] Every finding not fixed in this PR has its GitHub issue (template `finding`) and is linked above.
- [ ] If it touches personal or legal data, it is flagged in the plan.
- [ ] If it changes the UI, I attached light and dark screenshots.
