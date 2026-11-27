#!/usr/bin/env node
// Rule 4 of AGENTS.md made checkable: a work PR that changes code must bring its plan
// (a new or modified file in docs/plans/) or declare `No plan: <reason>` in its description.
//
// Usage in CI: PR_BRANCH=<branch> PR_BODY=<description> node scripts/pr-check-plan.mjs <changed files…>
//   or:        node scripts/pr-check-plan.mjs --branch X --body "text" file1 file2…
// Exit code 1 if the plan is missing. It only applies to feature/, fix/ and chore/ branches;
// docs/ branches and dev → main PRs are not checked.
import { pathToFileURL } from "node:url";

const PREFIXES = ["feature/", "fix/", "chore/"];
const CODE = ["apps/", "backend/", "packages/", "scripts/", ".claude/"];

// Returns { ok, reason }. `files` are paths relative to the root, with "/".
export function check({ branch = "", files = [], body = "" }) {
  if (!PREFIXES.some((p) => branch.startsWith(p))) {
    return { ok: true, reason: `branch «${branch}» is not checked (only ${PREFIXES.join(", ")})` };
  }
  const touchesCode = files.some((f) => CODE.some((c) => f.startsWith(c)));
  if (!touchesCode) return { ok: true, reason: "the PR does not change code" };
  const plan = files.find((f) => f.startsWith("docs/plans/") && f.endsWith(".md"));
  if (plan) return { ok: true, reason: `brings a plan: ${plan}` };
  const excuse = body.match(/^\s*No plan:\s*(\S.*)$/im);
  if (excuse) return { ok: true, reason: `no plan, declared: ${excuse[1].trim()}` };
  return {
    ok: false,
    reason:
      "the PR changes code but does not add or modify a plan in docs/plans/. Add the plan (rule 4 of AGENTS.md; feature-plan skill) " +
      "or write a «No plan: <reason>» line in the PR description if it is a minor fix.",
  };
}

function main() {
  const args = process.argv.slice(2);
  const files = [];
  let branch = process.env.PR_BRANCH ?? "";
  let body = process.env.PR_BODY ?? "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--branch") branch = args[++i] ?? "";
    else if (args[i] === "--body") body = args[++i] ?? "";
    else files.push(args[i]);
  }
  const { ok, reason } = check({ branch, files, body });
  if (ok) {
    console.log(`Plan: OK (${reason}).`);
  } else {
    console.error(`Plan: MISSING — ${reason}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
