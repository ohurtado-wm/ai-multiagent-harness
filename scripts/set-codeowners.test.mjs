import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { setOwner, validHandle } from "./set-codeowners.mjs";

const SCRIPT = new URL("./set-codeowners.mjs", import.meta.url).pathname;
const SAMPLE = ["# Sensitive paths", "", "/backend/migrations/ @template-owner", "/.github/ @someone @org/team", "/AGENTS.md   @template-owner", ""].join("\n");

test("every rule gets the new owner; comments, blank lines and paths are kept", () => {
  const { text, changed } = setOwner(SAMPLE, "@new-owner");
  assert.equal(changed, 3);
  assert.equal(text, ["# Sensitive paths", "", "/backend/migrations/ @new-owner", "/.github/ @new-owner", "/AGENTS.md @new-owner", ""].join("\n"));
});

test("it is idempotent", () => {
  const once = setOwner(SAMPLE, "@new-owner").text;
  const twice = setOwner(once, "@new-owner");
  assert.equal(twice.changed, 0);
  assert.equal(twice.text, once);
});

test("teams are accepted and invalid handles rejected", () => {
  for (const ok of ["@new-owner", "@a", "@my-org/platform_team", "@org/team.web"]) assert.ok(validHandle(ok), ok);
  for (const bad of ["new-owner", "@", "@-bad", "@bad-", "@two--hyphens", "@user/", "", undefined, "@user name"]) assert.ok(!validHandle(bad), String(bad));
  assert.throws(() => setOwner(SAMPLE, "owner"), /not a GitHub user/);
});

test("CLI: rewrites the file, and fails on an invalid handle without touching it", () => {
  const file = join(mkdtempSync(join(tmpdir(), "codeowners-")), "CODEOWNERS");
  writeFileSync(file, SAMPLE);
  const ok = spawnSync("node", [SCRIPT, "@new-owner", file], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /3 rule\(s\) now owned by @new-owner/);
  assert.match(readFileSync(file, "utf8"), /^\/AGENTS\.md @new-owner$/m);
  const bad = spawnSync("node", [SCRIPT, "not-a-handle", file], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(readFileSync(file, "utf8"), /@new-owner/);
});
