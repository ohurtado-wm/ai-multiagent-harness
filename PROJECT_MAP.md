# Monorepo index

## Main paths

| Path | Contents |
|---|---|
| `apps/web/` | Web application (replace the placeholder with your app). |
| `apps/mobile/` | Mobile application (native or cross-platform). |
| `backend/` | API, database migrations (`backend/migrations/`) and their tests (`backend/tests/`). |
| `packages/ui/` | Shared UI components; `src/tokens.css` is generated from `shared/design/tokens.json`. |
| `shared/` | Design tokens (`design/`), contracts between apps (`schemas/`) and shared fixtures (`fixtures/`). |
| `docs/` | Plans (`plans/`), status per area (`status/`), guides (`guides/`) and architecture (`architecture/`). |
| `scripts/` | Validation and harness scripts: `verify.sh`, `plan-status.mjs`, `pr-check-plan.mjs`, `check-links.mjs`, `check-json.mjs`, `build-tokens.mjs`, `setup-github-labels.sh` (labels for the GitHub Issues integration). |
| `.claude/` | The agent harness: `settings.json`, `hooks/`, `agents/`, `skills/`, `launch.json`. Explained in [`HARNESS.md`](HARNESS.md). |
| `.github/` | CI (`workflows/ci.yml`), plan check (`workflows/plan.yml`), PR template, `finding` issue template and `CODEOWNERS`. |

The implementation status (summary in [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md), detail per area in `docs/status/`) is not mandatory reading: open it only if you need to know what is done in an area.

## Validating what you changed

```sh
scripts/verify.sh              # picks the areas from what changed against origin/dev
scripts/verify.sh --list       # shows what it would run, without running anything
scripts/verify.sh web docs     # explicit areas: docs, contracts, web, backend, mobile, all
```

Each area runs the same commands as CI. If a tool or script is missing, the check comes out `SKIPPED` with the reason; CI uses `--strict`, where a skip counts as a failure.

| Area | What it runs | Triggered by changes in |
|---|---|---|
| `docs` | Markdown links, hook tests, plan table, harness script tests | `*.md`, `.claude/`, `.github/`, harness scripts |
| `contracts` | JSON well-formedness of `shared/`; `npm run contracts:check` if defined | `shared/schemas/`, `shared/fixtures/`, `backend/migrations/` |
| `web` | Tokens up to date; `typecheck`, `lint`, `test`, `build` of `apps/web` and `packages/ui` if defined | `apps/web/`, `packages/`, `shared/design/` |
| `backend` | `npm test` (or your DB test runner) in `backend/` | `backend/`, `shared/` |
| `mobile` | `npm test` in `apps/mobile/` (replace with `xcodebuild`/`gradlew` for native) | `apps/mobile/` |

Edit the `area_*` functions in `scripts/verify.sh` to plug in your real commands.

## Plans and status

```sh
node scripts/plan-status.mjs             # regenerates docs/status/plans.md from the plan headers
node scripts/plan-status.mjs --check     # fails if the page is stale or a header is inconsistent
node scripts/plan-status.mjs --summary   # in progress, waiting for the owner, what comes next
node scripts/plan-status.mjs --plan X    # one plan: status, parents, previous, next and children
```
