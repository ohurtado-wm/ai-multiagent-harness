---
status: in-validation
parent: PLAN_HARNESS.md
issue: 6
---

# Plan — Harness: one setup script for repositories created from the template

Standalone harness plan of [`PLAN_HARNESS.md`](PLAN_HARNESS.md). A repository created from the GitHub template inherits every file, including `.github/CODEOWNERS` with the template owner (`@ohurtado-wm`): in the new repository that rule is broken (the user has no access there) until someone edits it by hand. When done, **creating a repository from the template takes two commands: `gh repo create --template …` and `scripts/setup-new-repo.sh`**.

## Status

| Block | Contents | Status |
|---|---|---|
| A | `scripts/set-codeowners.mjs` (rewrite every rule's owner) and its test | Done |
| B | `scripts/setup-new-repo.sh`: CODEOWNERS, `dev` as default branch, labels, next steps | Done; only `--dry-run` was run |
| C | README, site, deck and docs use the script | Done |

**Out of this plan:** committing the `CODEOWNERS` change for the user (the script never commits: rule 1, no commits to `main`/`dev`; it prints the commands for a work branch and a PR), and creating branch protection (it stays a manual step in *Settings*, since it depends on the plan and the team).

## Owner decisions (2026-11-27)

| Topic | Decision |
|---|---|
| Approach | **A setup script run once in the new repository** (option 1 of three): the template keeps `@ohurtado-wm` as its own code owner, and copies are fixed automatically. |

## Design

- **`scripts/set-codeowners.mjs <handle> [file]`:** sets the owner of every rule line in `CODEOWNERS` (comments and blank lines untouched, paths kept), validates the handle (`@user` or `@org/team`) and is idempotent. Exported function + CLI, like the other harness scripts.
- **`scripts/setup-new-repo.sh [--codeowner @handle] [--dry-run] [owner/repo]`:** detects the repository (`gh repo view`) and the signed-in user (`gh api user`), then: (1) `set-codeowners.mjs` with `@<user>` or the given handle; (2) `dev` as the default branch if the remote has `dev`; (3) `setup-github-labels.sh`; (4) prints the next steps (work branch + PR for the `CODEOWNERS` change, branch protection, `/onboarding`). `--dry-run` only prints what it would do.
- **Validation area:** both files count as harness scripts (`docs` area of `verify.sh`), and the test joins the `docs` checks.

## Block A — set-codeowners.mjs

Files: `scripts/set-codeowners.mjs`, `scripts/set-codeowners.test.mjs`, `scripts/verify.sh`, `scripts/verify.test.mjs`.

Verification: `node --test scripts/set-codeowners.test.mjs` and `scripts/verify.sh docs`

## Block B — setup-new-repo.sh

Files: `scripts/setup-new-repo.sh`, `.github/CODEOWNERS` (comment).

Verification: `bash -n scripts/setup-new-repo.sh` and `scripts/setup-new-repo.sh --dry-run` against this repository.

## Block C — Documentation

Files: `README.md`, `HARNESS.md`, `PROJECT_MAP.md`, `docs/guides/GITHUB_ISSUES.md`, `docs/site/index.html`, `docs/site/presentation.html`, `docs/status/harness.md`.

Verification: `scripts/verify.sh`

## Closing criteria

1. `set-codeowners.mjs` rewrites every rule's owner, keeps comments, rejects invalid handles and is covered by tests.
2. `setup-new-repo.sh --dry-run` prints the CODEOWNERS change, the default-branch change and the labels without touching anything.
3. The README quick start, the site's «Adopt» block and the deck's adoption slide use the script.
4. `npm run test:harness` and `scripts/verify.sh` green.

## Risks

- **Running it in the template repository itself:** it would set `CODEOWNERS` to whoever runs it; harmless for the owner (same handle) and visible in `git diff` for anyone else, since the script never commits.
- **A repository without `dev`** (created without `--include-all-branches`): the script says so and skips the default-branch step instead of failing.

## Result (2026-11-27)

- **A:** `scripts/set-codeowners.mjs` with 4 tests (rewrite keeping comments and paths, idempotence, valid and invalid handles, CLI); registered in the `docs` area of `verify.sh` with a mapping test.
- **B:** `scripts/setup-new-repo.sh` with `--dry-run` and `--codeowner`. Dry runs against this repository: with the default owner it reports nothing to change; with `--codeowner @some-org/platform` it shows the six rules it would rewrite, and `CODEOWNERS` stays untouched.
- **C:** README quick start (create from the template → run the script → PR for `CODEOWNERS`), the site's «Adopt» command block, the deck's adoption slide, `HARNESS.md`, `PROJECT_MAP.md`, the GitHub Issues guide and the harness status.

### Differences from the plan

- None.

### What was not verified

- A full run (without `--dry-run`) in a repository freshly created from the template: this repository is not marked as a template yet, and that step belongs to its owner.

## Open questions

None.
