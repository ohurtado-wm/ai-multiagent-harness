#!/usr/bin/env bash
# Validates the repository by areas with the same commands PROJECT_MAP.md documents and CI runs.
#
# Usage: scripts/verify.sh [--list] [--strict] [--files "path path…"] [--areas] [area…]
#   no area, or «auto»: picks the areas from what changed against origin/dev (plus uncommitted changes).
#   «all»: every area.
#   Areas: docs, contracts, web, backend, mobile.
#   --list      shows what it would run, without running anything.
#   --strict    a SKIPPED check counts as a failure (CI uses it).
#   --files     instead of reading git, use this list of paths (for tests and for CI).
#   --areas     only prints the chosen areas (one per line) and exits; CI uses it to skip jobs.
#
# Output: one line per check («OK|FAIL|SKIPPED area label (seconds)»); if something fails, only that
# check's output. Exit code 1 if something failed; 2 on incorrect usage.
#
# To adapt it to your stack, edit the area_* functions (the commands) and areas_of (which paths
# trigger which area). Keep scripts/verify.test.mjs in sync.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ALL="docs contracts web backend mobile"

LIST=0
STRICT=0
FILES=""
HAS_FILES=0
REQUESTED=""
ONLY_AREAS=0
while [ $# -gt 0 ]; do
  case "$1" in
    --list) LIST=1 ;;
    --areas) ONLY_AREAS=1 ;;
    --strict) STRICT=1 ;;
    --files) shift; FILES="${1:-}"; HAS_FILES=1 ;;
    -h|--help) sed -n '2,19p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; exit 2 ;;
    *) REQUESTED="$REQUESTED $1" ;;
  esac
  shift
done

# --- Areas from the changed paths ---------------------------------------------------------------------
add() { case " $AREAS " in *" $1 "*) ;; *) AREAS="$AREAS $1" ;; esac; }

areas_of() {
  AREAS=""
  local path
  for path in $1; do
    # Documentation (README, AGENTS.md, plans) only affects the docs area, whatever folder it is in.
    case "$path" in
      *.md) add docs; continue ;;
    esac
    case "$path" in
      # Changing the validation mechanism itself can affect any area: every CI area runs.
      .github/workflows/ci.yml|scripts/verify.sh) add web; add contracts; add backend; add docs ;;
      package.json|package-lock.json) add web; add contracts ;;
      shared/design/*|scripts/build-tokens*) add web ;;
      shared/schemas/*|shared/fixtures/*|scripts/check-json*) add contracts; add backend ;;
      backend/migrations/*) add backend; add contracts ;;
      backend/*) add backend ;;
      apps/web/*|packages/*) add web ;;
      apps/mobile/*) add mobile ;;
      .claude/*|.github/*|scripts/verify*|scripts/plan-status*|scripts/pr-check-plan*|scripts/check-links.mjs|scripts/set-codeowners*|scripts/setup-*) add docs ;;
    esac
  done
}

changed_files() {
  if ! git -C "$ROOT" rev-parse --verify -q origin/dev >/dev/null; then
    echo "origin/dev does not exist: run «git fetch origin dev» or ask for an explicit area (for example: scripts/verify.sh web)." >&2
    return 1
  fi
  local base
  base="$(git -C "$ROOT" merge-base HEAD origin/dev 2>/dev/null)" || base="origin/dev"
  {
    git -C "$ROOT" diff --name-only "$base"
    git -C "$ROOT" diff --name-only HEAD
    git -C "$ROOT" ls-files --others --exclude-standard
  } | sort -u
}

if [ -z "${REQUESTED# }" ] || [ "${REQUESTED# }" = "auto" ]; then
  if [ "$HAS_FILES" -eq 0 ]; then
    FILES="$(changed_files)" || exit 2
  fi
  areas_of "$FILES"
  SELECTION="$AREAS"
  if [ "$ONLY_AREAS" -eq 1 ]; then
    for a in $SELECTION; do echo "$a"; done
    exit 0
  fi
  if [ -z "${SELECTION# }" ]; then
    echo "No changed file falls in an area with checks. Nothing to verify."
    exit 0
  fi
else
  SELECTION=""
  for a in $REQUESTED; do
    if [ "$a" = "all" ]; then SELECTION="$ALL"; continue; fi
    case " $ALL " in
      *" $a "*) SELECTION="$SELECTION $a" ;;
      *) echo "Unknown area: $a (areas: $ALL, all, auto)" >&2; exit 2 ;;
    esac
  done
fi

# --- Execution ----------------------------------------------------------------------------------------
OK=0; FAILS=0; SKIPS=0
OUTPUT="$(mktemp)"
trap 'rm -f "$OUTPUT"' EXIT

has() { command -v "$1" >/dev/null 2>&1; }

skipped() { # area label reason
  SKIPS=$((SKIPS + 1))
  echo "SKIPPED $1 $2 — $3"
}

step() { # area directory label command
  local area="$1" dir="$2" label="$3" cmd="$4"
  if [ "$LIST" -eq 1 ]; then
    printf '%-10s %s$ %s\n' "$area" "$dir" "$cmd"
    return
  fi
  local start=$SECONDS
  if (cd "$ROOT/$dir" && eval "$cmd") >"$OUTPUT" 2>&1; then
    OK=$((OK + 1))
    echo "OK      $area $label ($((SECONDS - start))s)"
  else
    FAILS=$((FAILS + 1))
    echo "FAIL    $area $label ($((SECONDS - start))s)"
    echo "--- output of: $cmd (in $dir)"
    tail -n 80 "$OUTPUT"
    echo "---"
  fi
}

# If something needed to run the check is missing, mark it skipped (never a silent success).
requires() { # area label reason test-command…
  local area="$1" label="$2" reason="$3"; shift 3
  [ "$LIST" -eq 1 ] && return 0
  if "$@" >/dev/null 2>&1; then return 0; fi
  skipped "$area" "$label" "$reason"
  return 1
}

# True if <dir>/package.json defines the npm script <name>.
has_script() { # dir name
  [ -f "$ROOT/$1/package.json" ] && node -e 'const s=require(process.argv[1]).scripts||{};process.exit(s[process.argv[2]]?0:1)' "$ROOT/$1/package.json" "$2"
}

# Runs `npm run <script>` in <dir> if the script exists; otherwise SKIPPED with the reason.
npm_step() { # area dir label script
  local area="$1" dir="$2" label="$3" script="$4"
  requires "$area" "$label" "$dir/package.json has no «$script» script" has_script "$dir" "$script" || return 0
  step "$area" "$dir" "$label" "npm run $script"
}

area_docs() {
  step docs . "links" "node scripts/check-links.mjs"
  step docs . "Claude Code hooks" "node --test --test-reporter=dot .claude/hooks/*.test.mjs"
  step docs . "plans table" "node scripts/plan-status.mjs --check"
  step docs . "harness scripts (verify, plan status, PR plan, CODEOWNERS)" "node --test --test-reporter=dot scripts/verify.test.mjs scripts/plan-status.test.mjs scripts/pr-check-plan.test.mjs scripts/set-codeowners.test.mjs"
}
area_contracts() {
  step contracts . "well-formed JSON in shared/" "node scripts/check-json.mjs shared"
  if [ "$LIST" -eq 1 ] || has_script . "contracts:check"; then
    step contracts . "contract schemas and fixtures" "npm run contracts:check"
  fi
}
area_web() {
  step web . "design tokens up to date" "node scripts/build-tokens.mjs --check"
  for dir in packages/ui apps/web; do
    npm_step web "$dir" "$dir typecheck" typecheck
    npm_step web "$dir" "$dir lint" lint
    npm_step web "$dir" "$dir tests" test
  done
  npm_step web apps/web "apps/web build" build
}
area_backend() {
  # Replace with your database test runner (for example «supabase test db» or «npm run test:db»).
  npm_step backend backend "backend tests" test
}
area_mobile() {
  # Native apps: replace with xcodebuild/gradlew; CI usually does not build them (validated locally).
  npm_step mobile apps/mobile "mobile tests" test
}

for a in $SELECTION; do
  "area_$(echo "$a" | tr '-' '_')"
done

if [ "$LIST" -eq 1 ]; then exit 0; fi
echo "Summary: $OK OK, $FAILS failed, $SKIPS skipped (areas:$SELECTION)"
if [ "$FAILS" -gt 0 ]; then exit 1; fi
if [ "$STRICT" -eq 1 ] && [ "$SKIPS" -gt 0 ]; then
  echo "Strict mode: there are skipped checks." >&2
  exit 1
fi
exit 0
