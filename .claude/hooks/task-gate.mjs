#!/usr/bin/env node
// TaskCreated and TaskCompleted hook: a task that belongs to a plan (subject starting with the block
// label, for example «[B] Function sales_summary_v1») must say how it is verified with a
// «Verification: <command>» line in its description. Without it, exit code 2 prevents creating or
// completing it and the message says what to add. Tasks without a label (coordination, questions) pass.
// On a parsing error it lets the task through.
import { pathToFileURL } from "node:url";

const LABEL = /^\s*\[[A-Z][A-Z0-9]*(\.[0-9]+)?\]/;
const VERIFICATION = /^\s*[-*]?\s*Verification:\s*\S/im;

export function evaluate(data) {
  const event = data?.hook_event_name;
  if (event !== "TaskCreated" && event !== "TaskCompleted") return null;
  const subject = data.task_subject ?? "";
  if (!LABEL.test(subject)) return null;
  if (VERIFICATION.test(data.task_description ?? "")) return null;
  const action = event === "TaskCreated" ? "create" : "complete";
  return `Cannot ${action} the task «${subject}»: it belongs to a plan block and its description does not say how it is verified. Add a «Verification: <command>» line (the focused test or scripts/verify.sh <area>) and try again.`;
}

async function main() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  try {
    const message = evaluate(JSON.parse(text));
    if (message) {
      console.error(`Blocked by .claude/hooks/task-gate.mjs. ${message}`);
      process.exit(2);
    }
  } catch (error) {
    console.error(`task-gate: could not parse the task (${error.message}); letting it through.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
