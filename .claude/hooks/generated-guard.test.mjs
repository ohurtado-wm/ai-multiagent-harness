import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { CONFIG, evaluate } from "./generated-guard.mjs";

const ROOT = "/repo";
const SQL = "backend/tests/fixtures.test.sql";
const sqlFile = ["select 1;", "-- BEGIN generated fixtures (do not edit)", "select is(1,1);", "-- END generated fixtures", "select 2;"].join("\n");
const read = () => sqlFile;
// Same generated files as the real configuration, plus an example BEGIN/END block.
const config = {
  ...CONFIG,
  blocks: [{ path: SQL, start: "-- BEGIN generated fixtures", end: "-- END generated fixtures", command: "node scripts/generate-fixtures.mjs", source: "shared/fixtures/example.json" }],
};

test("generated tokens: always blocked, with the source and the command", () => {
  const msg = evaluate("Edit", { file_path: `${ROOT}/packages/ui/src/tokens.css`, old_string: "a", new_string: "b" }, ROOT, read, config);
  assert.ok(msg?.includes("shared/design/tokens.json") && msg.includes("npm run tokens"));
});

test("a relative path is also recognized", () => {
  assert.ok(evaluate("Write", { file_path: "packages/ui/src/tokens.css", content: "x" }, ROOT, read, config));
});

test("normal files and the tokens source pass", () => {
  assert.equal(evaluate("Edit", { file_path: `${ROOT}/shared/design/tokens.json`, old_string: "a", new_string: "b" }, ROOT, read, config), null);
  assert.equal(evaluate("Edit", { file_path: `${ROOT}/packages/ui/src/index.ts`, old_string: "a", new_string: "b" }, ROOT, read, config), null);
  assert.equal(evaluate("Write", { file_path: `${ROOT}/README.md`, content: "x" }, ROOT, read, config), null);
});

test("BEGIN/END block: only the generated block is protected", () => {
  const path = `${ROOT}/${SQL}`;
  assert.ok(evaluate("Edit", { file_path: path, old_string: "select is(1,1);", new_string: "x" }, ROOT, read, config));
  assert.ok(evaluate("Edit", { file_path: path, old_string: "-- END generated fixtures", new_string: "x" }, ROOT, read, config));
  assert.equal(evaluate("Edit", { file_path: path, old_string: "select 2;", new_string: "select 3;" }, ROOT, read, config), null);
  assert.ok(evaluate("MultiEdit", { file_path: path, edits: [{ old_string: "select 2;", new_string: "x" }, { old_string: "select is(1,1);", new_string: "y" }] }, ROOT, read, config));
  assert.equal(evaluate("Write", { file_path: path, content: sqlFile.replace("select 2;", "select 3;") }, ROOT, read, config), null);
  const msg = evaluate("Write", { file_path: path, content: sqlFile.replace("select is(1,1);", "select is(2,2);") }, ROOT, read, config);
  assert.ok(msg?.includes("node scripts/generate-fixtures.mjs") && msg.includes("shared/fixtures/example.json"));
});

test("a file listed as a block but without the markers is not protected", () => {
  assert.equal(evaluate("Edit", { file_path: `${ROOT}/${SQL}`, old_string: "a", new_string: "b" }, ROOT, () => "no markers", config), null);
});

test("CLI: exit code 2 with a message, and broken JSON does not block", () => {
  const run = (input) =>
    spawnSync("node", [new URL("./generated-guard.mjs", import.meta.url).pathname], { input, encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT } });
  const bad = run(JSON.stringify({ tool_name: "Edit", tool_input: { file_path: `${ROOT}/packages/ui/src/tokens.css`, old_string: "a", new_string: "b" } }));
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /npm run tokens/);
  assert.equal(run("not json").status, 0);
});
