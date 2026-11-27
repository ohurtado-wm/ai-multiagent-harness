import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { evaluate } from "./task-gate.mjs";

const task = (hook_event_name, task_subject, task_description) => ({ hook_event_name, task_id: "t1", task_subject, task_description });

function allows(event, subject, description) {
  assert.equal(evaluate(task(event, subject, description)), null, `should allow: ${subject}`);
}

test("a block task without Verification is neither created nor completed", () => {
  assert.match(evaluate(task("TaskCreated", "[B] Function sales_summary_v1", "Write the function")), /Verification:/);
  assert.match(evaluate(task("TaskCompleted", "[C] Reports screen", undefined)), /complete/);
  assert.ok(evaluate(task("TaskCreated", "[B2] Pagination", "Verification:")), "an empty line does not count");
});

test("a block task with Verification passes", () => {
  allows("TaskCreated", "[B] Function sales_summary_v1", "Write the function.\nVerification: cd backend && npm test");
  allows("TaskCompleted", "[C] Screen", "- Verification: scripts/verify.sh web");
  allows("TaskCreated", "[A.1] Contract", "verification: scripts/verify.sh contracts");
});

test("tasks without a block label and other events pass", () => {
  allows("TaskCreated", "Ask the owner about pagination", undefined);
  allows("TaskCompleted", "Review messages", "");
  assert.equal(evaluate({ hook_event_name: "TeammateIdle", teammate_name: "qa" }), null);
});

test("the script blocks with exit code 2 and lets invalid input through", () => {
  const run = (input) => spawnSync(process.execPath, [new URL("./task-gate.mjs", import.meta.url).pathname], { input, encoding: "utf8" });
  const r = run(JSON.stringify(task("TaskCreated", "[B] X", "no verification")));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /task-gate/);
  assert.equal(run(JSON.stringify(task("TaskCreated", "[B] X", "Verification: npm test"))).status, 0);
  assert.equal(run("not json").status, 0);
});
