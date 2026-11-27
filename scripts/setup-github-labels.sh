#!/usr/bin/env bash
# Creates (or updates) the GitHub labels the harness uses. Idempotent: safe to run again.
# Requires the GitHub CLI signed in (gh auth login) and write access to the repository.
# Usage: scripts/setup-github-labels.sh [owner/repo]   (default: the repository of the current folder)
set -euo pipefail
REPO_ARGS=()
if [ $# -gt 0 ]; then REPO_ARGS=(--repo "$1"); fi

label() { # name color description
  gh label create "$1" --color "$2" --description "$3" --force ${REPO_ARGS[@]+"${REPO_ARGS[@]}"} >/dev/null
  echo "OK  $1"
}

# Kind of plan or finding
label epic          "3e4b9e" "Phase plan: its milestones and findings are sub-issues"
label enhancement   "a2eeef" "New feature or improvement (milestone and standalone plans)"
label bug           "d73a4a" "Something is not working"
label documentation "0075ca" "Documentation only"

# Issue loop (resolve-issues)
label ai-queue      "0e8a16" "An agent may take this issue and open a PR without asking"
label ai-merge      "1d76db" "The agent may also merge the PR into dev when everything is green (added by a person)"
label ai-escalated  "fbca04" "Left out of the AI queue; see the comment for the reason"
