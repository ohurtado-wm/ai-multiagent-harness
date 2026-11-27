import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { format, summarizePlans } from "./session-context.mjs";

test("on dev it warns not to commit", () => {
  const t = format({ branch: "dev", plans: [], uncommitted: 0 });
  assert.match(t, /Current branch: dev\. Do not commit here/);
  assert.doesNotMatch(t, /has no open PR/);
});

test("work branch with PR, plans and uncommitted changes", () => {
  const t = format({
    branch: "chore/harness-context",
    pr: { number: 55, title: "Context", baseRefName: "dev", url: "https://github.com/o/r/pull/55" },
    plans: ["PLAN_HARNESS.md"],
    uncommitted: 3,
  });
  assert.match(t, /Open PR: #55 «Context» against dev \(https:\/\/github\.com\/o\/r\/pull\/55\)/);
  assert.match(t, /Plans touched by this branch: PLAN_HARNESS\.md/);
  assert.match(t, /Uncommitted changes: 3 file/);
  assert.match(t, /not mandatory/);
});

test("a work branch without a PR says so; without a branch it returns nothing", () => {
  assert.match(format({ branch: "fix/x" }), /has no open PR/);
  assert.equal(format({ branch: "" }), "");
});

test("detached HEAD (as in a PR's CI) does not break the context", () => {
  const t = format({ branch: "", commit: "abc1234" });
  assert.match(t, /Detached HEAD at abc1234/);
  assert.doesNotMatch(t, /PR/);
});

test("CLI: exits 0 and prints the branch, even with invalid input", () => {
  const r = spawnSync("node", [new URL("./session-context.mjs", import.meta.url).pathname], { input: "not json", encoding: "utf8", timeout: 15000 });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Current branch:|Detached HEAD at/);
});

test("adds the active plans summary before the final notice", () => {
  const t = format({ branch: "fix/x", plansSummary: "Plans in progress: phase 3 (F3.md)." });
  assert.match(t, /Plans in progress: phase 3 \(F3\.md\)\.\nReading the project status is not mandatory/);
});

test("summarizePlans reads the repository's real plans and does not fail outside it", async () => {
  assert.match(await summarizePlans(new URL("../..", import.meta.url).pathname), /Detail: docs\/status\/plans\.md/);
  assert.equal(await summarizePlans("/"), "");
});
