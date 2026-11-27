import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { check } from "./pr-check-plan.mjs";

const SCRIPT = new URL("./pr-check-plan.mjs", import.meta.url).pathname;

test("code without a plan on a work branch fails, for every watched prefix", () => {
  for (const branch of ["feature/phase-3-milestone-2-web", "fix/x", "chore/x", "codex/x"]) {
    const r = check({ branch, files: ["apps/web/src/page.tsx"], body: "" });
    assert.equal(r.ok, false, branch);
    assert.match(r.reason, /No plan:/);
  }
});

test("a new or modified plan in docs/plans/ satisfies it", () => {
  const r = check({ branch: "feature/x", files: ["backend/migrations/a.sql", "docs/plans/product/phase-3/PLAN_X.md"] });
  assert.equal(r.ok, true);
  assert.match(r.reason, /brings a plan/);
});

test("a non-.md file in docs/plans/ does not count as a plan", () => {
  assert.equal(check({ branch: "fix/x", files: ["apps/mobile/A.tsx", "docs/plans/image.png"] }).ok, false);
});

test("«No plan: reason» in the description allows it; without a reason it does not", () => {
  const files = ["apps/mobile/src/A.tsx"];
  assert.equal(check({ branch: "fix/x", files, body: "Fixes a typo.\n\nNo plan: text fix" }).ok, true);
  assert.equal(check({ branch: "fix/x", files, body: "no plan: minor fix" }).ok, true);
  assert.equal(check({ branch: "fix/x", files, body: "No plan:" }).ok, false);
  assert.equal(check({ branch: "fix/x", files, body: "there is No plan: here in the middle" }).ok, false);
});

test("without code changes no plan is required", () => {
  assert.equal(check({ branch: "chore/x", files: ["docs/status/web.md", "README.md", ".github/CODEOWNERS"] }).ok, true);
});

test("docs/ branches and dev → main PRs are not checked", () => {
  assert.equal(check({ branch: "docs/x", files: ["apps/web/A.tsx"] }).ok, true);
  assert.equal(check({ branch: "dev", files: ["apps/web/A.tsx"] }).ok, true);
});

test("harness scripts, skills and client configuration count as code", () => {
  assert.equal(check({ branch: "chore/x", files: ["scripts/verify.sh"] }).ok, false);
  assert.equal(check({ branch: "chore/x", files: [".claude/hooks/a.mjs"] }).ok, false);
  assert.equal(check({ branch: "codex/x", files: [".codex/agents/coder.toml"] }).ok, false);
  assert.equal(check({ branch: "codex/x", files: [".agents/skills/configure-agents/SKILL.md"] }).ok, false);
});

test("CLI: environment variables and exit code", () => {
  const fails = spawnSync("node", [SCRIPT, "apps/web/A.tsx"], { encoding: "utf8", env: { ...process.env, PR_BRANCH: "fix/x", PR_BODY: "" } });
  assert.equal(fails.status, 1);
  assert.match(fails.stderr, /MISSING/);
  const passes = spawnSync("node", [SCRIPT, "apps/web/A.tsx"], { encoding: "utf8", env: { ...process.env, PR_BRANCH: "fix/x", PR_BODY: "No plan: typo" } });
  assert.equal(passes.status, 0);
  assert.match(passes.stdout, /OK/);
});
