#!/usr/bin/env bash
# One-time setup for a repository created from the agent-harness template. Run it from the new
# repository's folder, signed in to GitHub (gh auth login) as its owner or an admin. It:
#   1. points every rule in .github/CODEOWNERS to you (or to --codeowner), so the copy does not keep
#      the template owner;
#   2. makes dev the default branch (Closes #n closes issues on merge into dev);
#   3. creates the labels the harness uses (scripts/setup-github-labels.sh);
#   4. prints the next steps. It never commits: the CODEOWNERS change goes through a work branch and a PR.
#
# Usage: scripts/setup-new-repo.sh [--codeowner @user|@org/team] [--dry-run] [owner/repo]
#   owner/repo    defaults to the repository of the current folder (gh repo view).
#   --codeowner   defaults to the signed-in GitHub user.
#   --dry-run     shows what it would do without changing anything.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

DRY=0
HANDLE=""
REPO=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1 ;;
    --codeowner) shift; HANDLE="${1:-}" ;;
    -h|--help) sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; exit 2 ;;
    *) REPO="$1" ;;
  esac
  shift
done

command -v gh >/dev/null 2>&1 || { echo "The GitHub CLI (gh) is required: https://cli.github.com" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required." >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Sign in first: gh auth login" >&2; exit 1; }

if [ -z "$REPO" ]; then
  REPO="$(cd "$ROOT" && gh repo view --json nameWithOwner --jq .nameWithOwner)"
fi
if [ -z "$HANDLE" ]; then
  HANDLE="@$(gh api user --jq .login)"
fi

echo "Repository: $REPO"
echo "Code owner: $HANDLE"
[ "$DRY" -eq 1 ] && echo "Mode:       dry run (nothing will change)"
echo

# --- 1. CODEOWNERS ----------------------------------------------------------------------------------
CODEOWNERS="$ROOT/.github/CODEOWNERS"
echo "1. CODEOWNERS"
if [ ! -f "$CODEOWNERS" ]; then
  echo "   SKIPPED: .github/CODEOWNERS does not exist."
elif [ "$DRY" -eq 1 ]; then
  TMP="$(mktemp)"
  trap 'rm -f "$TMP"' EXIT
  cp "$CODEOWNERS" "$TMP"
  node "$ROOT/scripts/set-codeowners.mjs" "$HANDLE" "$TMP" | sed 's/^/   would set: /'
  diff -u "$CODEOWNERS" "$TMP" | sed -n '3,$p' | grep '^[-+]' | sed 's/^/   /' || true
else
  node "$ROOT/scripts/set-codeowners.mjs" "$HANDLE" "$CODEOWNERS" | sed 's/^/   /'
fi

# --- 2. Default branch -------------------------------------------------------------------------------
echo "2. Default branch"
CURRENT="$(gh repo view "$REPO" --json defaultBranchRef --jq .defaultBranchRef.name)"
if ! gh api "repos/$REPO/branches/dev" >/dev/null 2>&1; then
  echo "   WARN: the repository has no dev branch (was it created without --include-all-branches?)."
  echo "   Create it from main, then run this script again: git push origin main:dev"
elif [ "$CURRENT" = "dev" ]; then
  echo "   OK: dev is already the default branch."
elif [ "$DRY" -eq 1 ]; then
  echo "   would run: gh repo edit $REPO --default-branch dev   (now: $CURRENT)"
else
  gh repo edit "$REPO" --default-branch dev >/dev/null
  echo "   OK: dev is now the default branch (was $CURRENT)."
fi

# --- 3. Labels ---------------------------------------------------------------------------------------
echo "3. Labels"
if [ "$DRY" -eq 1 ]; then
  echo "   would run: scripts/setup-github-labels.sh $REPO   (epic, enhancement, bug, documentation, ai-queue, ai-merge, ai-escalated)"
else
  "$ROOT/scripts/setup-github-labels.sh" "$REPO" | sed 's/^/   /'
fi

# --- 4. Next steps -----------------------------------------------------------------------------------
echo
echo "Next steps:"
STEP=1
if [ "$DRY" -eq 0 ] && ! git -C "$ROOT" diff --quiet -- .github/CODEOWNERS 2>/dev/null; then
  echo "  $STEP. Commit the CODEOWNERS change on a work branch and open a PR against dev (rule 1: no commits to main or dev):"
  echo "       git switch -c chore/setup-codeowners"
  echo "       git commit -am \"chore: CODEOWNERS for $HANDLE\""
  echo "       git push -u origin chore/setup-codeowners"
  echo "       gh pr create --base dev --fill"
  STEP=$((STEP + 1))
fi
echo "  $STEP. Protect main and dev in Settings → Rules (no direct pushes, required CI checks)."
echo "  $((STEP + 1)). Open Claude Code in this folder and run /onboarding."
echo "  $((STEP + 2)). Make it yours: AGENTS.md «Project context», the folders' rules and scripts/verify.sh (HARNESS.md, «Adopting it in your project»)."
