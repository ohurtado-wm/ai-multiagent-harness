import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const SCRIPT = new URL("./verify.sh", import.meta.url).pathname;

// Areas the script would pick for these paths (uses --list: runs nothing).
function areasFor(paths) {
  const r = spawnSync("bash", [SCRIPT, "--list", "--files", paths.join(" ")], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const areas = new Set();
  for (const line of r.stdout.split("\n")) {
    const m = line.match(/^(\S+)\s+\S+\$ /);
    if (m) areas.add(m[1]);
  }
  return [...areas].sort();
}

test("documentation only → docs", () => {
  assert.deepEqual(areasFor(["docs/plans/product/PLAN_PRODUCT.md"]), ["docs"]);
  assert.deepEqual(areasFor(["README.md"]), ["docs"]);
});

test("a .md inside a code folder only triggers docs", () => {
  assert.deepEqual(areasFor(["apps/web/AGENTS.md", "backend/README.md"]), ["docs"]);
  assert.deepEqual(areasFor(["apps/web/AGENTS.md", "apps/web/src/page.tsx"]), ["docs", "web"]);
});

test("contracts → contracts and backend", () => {
  assert.deepEqual(areasFor(["shared/schemas/order.schema.json"]), ["backend", "contracts"]);
  assert.deepEqual(areasFor(["shared/fixtures/order.json"]), ["backend", "contracts"]);
});

test("web apps, packages and tokens → web", () => {
  assert.deepEqual(areasFor(["apps/web/src/page.tsx"]), ["web"]);
  assert.deepEqual(areasFor(["packages/ui/src/index.ts"]), ["web"]);
  assert.deepEqual(areasFor(["shared/design/tokens.json"]), ["web"]);
});

test("backend and migrations", () => {
  assert.deepEqual(areasFor(["backend/src/api.ts"]), ["backend"]);
  assert.deepEqual(areasFor(["backend/migrations/20260101_x.sql"]), ["backend", "contracts"]);
});

test("mobile app", () => {
  assert.deepEqual(areasFor(["apps/mobile/src/App.tsx"]), ["mobile"]);
});

test("several areas at once, documentation included", () => {
  assert.deepEqual(areasFor(["apps/web/src/page.tsx", "backend/migrations/x.sql", "docs/PROJECT_STATUS.md"]), ["backend", "contracts", "docs", "web"]);
});

test("harness configuration and CI → docs", () => {
  assert.deepEqual(areasFor([".claude/hooks/git-guard.mjs"]), ["docs"]);
  assert.deepEqual(areasFor([".github/workflows/plan.yml"]), ["docs"]);
});

test("changing the validation mechanism runs every CI area", () => {
  assert.deepEqual(areasFor([".github/workflows/ci.yml"]), ["backend", "contracts", "docs", "web"]);
  assert.deepEqual(areasFor(["scripts/verify.sh"]), ["backend", "contracts", "docs", "web"]);
  assert.deepEqual(areasFor(["package-lock.json"]), ["contracts", "web"]);
});

test("paths without checks pick nothing", () => {
  const r = spawnSync("bash", [SCRIPT, "--list", "--files", "tools/notes.txt"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Nothing to verify/);
});

test("explicit area, all and unknown area", () => {
  const all = spawnSync("bash", [SCRIPT, "--list", "all"], { encoding: "utf8" });
  assert.equal(all.status, 0);
  for (const a of ["docs", "contracts", "web", "backend", "mobile"]) {
    assert.match(all.stdout, new RegExp(`^${a}\\s`, "m"), a);
  }
  const bad = spawnSync("bash", [SCRIPT, "--list", "nothing"], { encoding: "utf8" });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /Unknown area/);
});

test("--list of the docs area shows the real commands", () => {
  const r = spawnSync("bash", [SCRIPT, "--list", "docs"], { encoding: "utf8" });
  assert.match(r.stdout, /check-links\.mjs/);
  assert.match(r.stdout, /plan-status\.mjs --check/);
});

test("--areas prints only the areas, one per line, and nothing if there are none", () => {
  const some = spawnSync("bash", [SCRIPT, "--areas", "--files", "docs/a.md apps/web/x.ts"], { encoding: "utf8" });
  assert.equal(some.status, 0);
  assert.deepEqual(some.stdout.trim().split("\n").sort(), ["docs", "web"]);
  const none = spawnSync("bash", [SCRIPT, "--areas", "--files", "tools/notes.txt"], { encoding: "utf8" });
  assert.equal(none.status, 0);
  assert.equal(none.stdout, "");
});

test("an area whose app has no package.json is SKIPPED, and --strict turns it into a failure", () => {
  const normal = spawnSync("bash", [SCRIPT, "mobile"], { encoding: "utf8" });
  assert.equal(normal.status, 0, normal.stdout + normal.stderr);
  assert.match(normal.stdout, /^SKIPPED mobile mobile tests/m);
  const strict = spawnSync("bash", [SCRIPT, "--strict", "mobile"], { encoding: "utf8" });
  assert.equal(strict.status, 1);
  assert.match(strict.stderr, /Strict mode/);
});
