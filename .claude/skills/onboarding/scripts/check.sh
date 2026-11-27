#!/usr/bin/env bash
# Checks the development environment. Read only: it installs nothing.
# Output: one line per item -> "OK|MISSING|WARN <name> <detail>"
# Exit code: 1 if a required item is missing.

missing=0
ok()   { echo "OK      $1 $2"; }
warn() { echo "WARN    $1 $2"; }
fail() { echo "MISSING $1 $2"; missing=1; }

has() { command -v "$1" >/dev/null 2>&1; }

# Operating system: mac | windows | other (Windows through Git Bash/MSYS/Cygwin)
case "$(uname -s)" in
  Darwin) os=mac ;;
  MINGW*|MSYS*|CYGWIN*) os=windows ;;
  *) os=other ;;
esac
echo "INFO    os $os"

# --- Skills (looked up in the project and in the user's folders) ---
skill() {
  local name="$1" pattern="$2" required="$3" d
  for d in .claude/skills ~/.claude/skills ~/.agents/skills; do
    if ls -d $d/$pattern >/dev/null 2>&1; then ok "skill:$name" "($d)"; return; fi
  done
  if [ "$required" = yes ]; then fail "skill:$name" ""; else warn "skill:$name" "not installed (recommended)"; fi
}
skill find-skills find-skills yes
skill frontend-design frontend-design no
skill webapp-testing webapp-testing no

# --- Repository skills and subagents (versioned in .claude/) ---
for s in feature-plan onboarding new-branch close-increment reference-parity verify-ui orchestrate-team configure-agents resolve-issues; do
  if [ -f ".claude/skills/$s/SKILL.md" ]; then ok "repo-skill:$s" ""; else fail "repo-skill:$s" "missing .claude/skills/$s/SKILL.md"; fi
done
for a in coder documenter qa pr-reviewer db-security-reviewer contract-reviewer reference-explorer; do
  if [ -f ".claude/agents/$a.md" ]; then ok "subagent:$a" ""; else fail "subagent:$a" "missing .claude/agents/$a.md"; fi
done

# --- Harness hooks run with node ---
for h in git-guard team-guard generated-guard task-gate session-context; do
  if [ -f ".claude/hooks/$h.mjs" ]; then ok "hook:$h" ""; else fail "hook:$h" "missing .claude/hooks/$h.mjs"; fi
done

# --- General tools ---
tools="git gh node npm npx"
[ "$os" = mac ] && tools="$tools brew"
for t in $tools; do
  if has "$t"; then ok "$t" "$($t --version 2>/dev/null | head -1)"; else fail "$t" ""; fi
done
if has gh && ! gh auth status >/dev/null 2>&1; then warn gh-auth "gh is not signed in: run gh auth login"; fi

# --- Agent teams: Codex writes the code (optional; without it, coders implement on their own) ---
if has codex; then
  if codex login status >/dev/null 2>&1; then ok codex "$(codex --version 2>/dev/null | head -1)"
  else warn codex "installed without a session: run codex login"; fi
else
  warn codex "not installed (optional, for agent teams)"
fi
if ls -d ~/.claude/plugins/cache/openai-codex/codex >/dev/null 2>&1; then ok plugin:codex "codex@openai-codex"
else warn plugin:codex "not installed (optional, for agent teams)"; fi

# --- Docker (optional: local database and services) ---
if has docker; then
  if docker info >/dev/null 2>&1; then ok docker "$(docker --version)"
  else warn docker "installed but the daemon does not answer (open Docker Desktop)"; fi
else
  warn docker "not installed (optional, for a local database)"
fi

# --- Add your stack's toolchain here (and to the table in SKILL.md), for example:
# if has supabase; then ok supabase-cli "$(supabase --version)"; else fail supabase-cli ""; fi
# if [ "$os" = mac ]; then xcodebuild -version >/dev/null 2>&1 && ok xcode "" || fail xcode ""; fi

exit $missing
