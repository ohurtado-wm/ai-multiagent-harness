import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { evaluate } from "./team-guard.mjs";

const ROOT = "/repo";
const bash = (command, agent = { agent_id: "a1", agent_type: "coder" }) => ({ ...agent, tool_name: "Bash", tool_input: { command } });
const edit = (file_path, agent_type, tool_name = "Edit") => ({ agent_id: "a1", agent_type, tool_name, tool_input: { file_path } });
const blocks = (data) => assert.ok(evaluate(data, ROOT), `should block: ${JSON.stringify(data.tool_input)}`);
const allows = (data) => assert.equal(evaluate(data, ROOT), null, `should allow: ${JSON.stringify(data.tool_input)}`);

test("the main session is not affected", () => {
  allows({ tool_name: "Bash", tool_input: { command: "git commit -m x && git push" } });
  allows({ tool_name: "Edit", tool_input: { file_path: ".claude/settings.json" } });
});

test("a teammate does not write history or switch branches", () => {
  for (const c of [
    "git commit -m x",
    "git add . && git commit -m x",
    "git push -u origin feature/x",
    "git -C apps/web commit -m x",
    "git switch dev",
    "git checkout dev",
    "git checkout -b feature/other",
    "git stash push -m x",
    "git reset --hard",
    "git rebase origin/dev",
    "git merge origin/dev",
    "git pull",
    "git branch new",
    "git branch -D old",
    "git worktree add ../x",
    "bash -c 'git commit -m x'",
    "gh pr create --base dev",
    "gh pr merge 12",
  ]) blocks(bash(c));
});

test("a teammate can read git and restore files", () => {
  for (const c of [
    "git status --short",
    "git diff --stat",
    "git diff origin/dev...HEAD",
    "git log --oneline -5",
    "git show HEAD:AGENTS.md",
    "git branch --show-current",
    "git branch -a",
    "git checkout -- apps/web/src/page.tsx",
    "git checkout HEAD -- backend/migrations/x.sql",
    "git restore apps/web/src/x.ts",
    'echo "git commit -m x"',
    "gh pr view 83",
    "gh pr checks 83",
    "scripts/verify.sh web",
  ]) allows(bash(c));
});

test("nobody outside the main session edits the harness configuration", () => {
  blocks(edit(".claude/settings.json", "coder"));
  blocks(edit("/repo/.claude/settings.local.json", "qa", "Write"));
  blocks(edit(".claude/hooks/git-guard.mjs", "documenter"));
  allows(edit(".claude/agents/qa.md", "coder"));
});

test("the documenter only edits its own files", () => {
  allows(edit("docs/plans/product/phase-6/PLAN.md", "documenter"));
  allows(edit("/repo/PROJECT_MAP.md", "documenter", "Write"));
  allows(edit("apps/web/AGENTS.md", "documenter"));
  allows(edit("AGENTS.md", "documenter"));
  allows(edit("HARNESS.md", "documenter"));
  blocks(edit("apps/web/src/page.tsx", "documenter"));
  blocks(edit("backend/migrations/1_x.sql", "documenter", "MultiEdit"));
  allows(edit("apps/web/src/page.tsx", "coder"));
});

const web = { areas: () => new Set(["web", "backend", "docs"]) };
const mobile = { areas: () => new Set(["mobile", "docs"]) };
const role = (agent_type) => ({ agent_id: "a1", agent_type });

test("no subagent resets the local database", () => {
  for (const c of ["supabase db reset", "cd backend && supabase db reset --local", "npx supabase db reset", "bash -c 'supabase db reset'", "npx prisma migrate reset", "npm run db:reset"]) {
    assert.match(evaluate(bash(c, role("general-purpose")), ROOT, web) ?? "", /without wiping/, c);
  }
  allows(bash("supabase migration up --local"));
  allows(bash("npx prisma migrate deploy"));
  allows({ tool_name: "Bash", tool_input: { command: "supabase db reset" } }); // the coordinator can
});

test("regression tests need the coordinator's flag", () => {
  for (const c of ["scripts/e2e-web.sh", "bash scripts/integration-api.sh", "scripts/regression-mobile.sh"]) {
    assert.match(evaluate(bash(c, role("qa")), ROOT, mobile) ?? "", /regression/, c);
  }
  assert.equal(evaluate(bash("REGRESSIONS_APPROVED=1 scripts/e2e-web.sh", role("qa")), ROOT, web), null);
  assert.equal(evaluate(bash("scripts/e2e-web.sh", role("general-purpose")), ROOT, web), null); // outside the team, its brief decides
});

test("a regression script with ONLY or TEST is focused: no permission needed", () => {
  for (const c of ["ONLY=CheckoutTests scripts/e2e-web.sh", "ONLY=CheckoutTests TEST=testPay scripts/integration-api.sh"]) {
    assert.equal(evaluate(bash(c, role("qa")), ROOT, web), null, c);
  }
  assert.match(evaluate(bash("ONLY= scripts/e2e-web.sh", role("qa")), ROOT, web) ?? "", /regression/);
});

test("in a web change the team does not build or test the native mobile app", () => {
  for (const c of [
    "xcodebuild -scheme App build",
    "xcrun simctl install booted x.app",
    "cd apps/mobile && swift test",
    "scripts/mobile-sandbox.sh",
    "scripts/verify.sh mobile",
    "scripts/verify.sh all",
    "cd apps/mobile/android && ./gradlew test",
  ]) assert.match(evaluate(bash(c, role("qa")), ROOT, web) ?? "", /does not touch/, c);
  for (const c of ["scripts/verify.sh", "scripts/verify.sh web backend", "swift --version"]) {
    assert.equal(evaluate(bash(c, role("qa")), ROOT, web), null, c);
  }
});

test("if the diff touches mobile its focused tests are allowed; if the diff is unknown, it lets them through", () => {
  for (const c of ["cd apps/mobile && swift test", "scripts/verify.sh mobile", "xcodebuild -scheme App build", "./gradlew test"]) {
    assert.equal(evaluate(bash(c, role("coder")), ROOT, mobile), null, c);
  }
  assert.equal(evaluate(bash("xcodebuild build", role("qa")), ROOT, { areas: () => null }), null);
  assert.equal(evaluate(bash("xcodebuild build", role("general-purpose")), ROOT, web), null);
});

test("the script blocks with exit code 2 and lets invalid input through", () => {
  const run = (input) => spawnSync(process.execPath, [new URL("./team-guard.mjs", import.meta.url).pathname], { input, encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT } });
  const r = run(JSON.stringify(bash("git commit -m x")));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /coordinator/);
  assert.equal(run(JSON.stringify(bash("git status"))).status, 0);
  assert.equal(run("not json").status, 0);
});
