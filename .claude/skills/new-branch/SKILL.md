---
name: new-branch
description: Creates the work branch for the next piece of work from an up-to-date dev, checking git status and open PRs first. Use it when starting a feature, milestone or fix, when someone says "new branch", "start milestone N", "continue with the next one", or when a PR was merged and work must continue (rule: new branch after each merge).
---

# New branch

Work never happens on `main` or `dev` (rules 1 and 2 of `AGENTS.md`; the `git-guard` hook prevents it). This skill leaves a clean branch from an up-to-date `dev`.

## Steps

1. **Current state** (read only): `git branch --show-current`, `git status --short` and `gh pr list --state open --head "$(git branch --show-current)"`.
   - If there are uncommitted changes, **stop and ask** what to do with them (commit them on their branch, stash them or discard them). Do not carry them to the new branch without saying so.
   - If the current branch has an **open, unmerged** PR and the new work depends on it, say so: the new branch can come out of that branch (stacked) instead of `dev`; ask which they prefer. If it does not depend on it, continue from `dev`.
2. **Name** (by kind of work, lowercase with hyphens):
   - By milestone: `feature/phase-N-milestone-M-topic` (or `feature/phase-N-topic`).
   - A new phase and its first milestone share **a single branch** (`feature/phase-N-milestone-1-topic`): publish it from the first commit (the phase plan) and do not open the PR until the milestone is done. Later milestones get a new branch from `dev` after merging.
   - Others: `feature/topic`, `fix/topic`, `docs/topic` or `chore/topic`. If in doubt between two, ask.
3. **Create:** `git switch dev && git pull`, then `git switch -c <branch>`. If the session runs in a worktree the app created, the branch may already exist: bring it up to date with the base branch instead of a manual `git merge`.
4. **Confirm:** `git branch --show-current` and `git log --oneline -1`. Say in one line where the branch came from.

## Afterwards

Before implementing a feature, the plan (rule 4): use `feature-plan`. When the milestone is done, `close-increment`, which is where the PR is opened for the first time.
