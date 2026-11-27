#!/usr/bin/env node
// SessionStart hook (its text is written as facts, not orders: imperative hook context can trigger
// Claude's prompt-injection defenses): adds to the context, in a few lines, what would otherwise require reading the full
// status: the current branch (with a warning if it is main or dev), the branch's open PR, the plans the
// branch modified against dev, whether there are uncommitted changes and the summary of the active plans
// (scripts/plan-status.mjs --summary: in progress, waiting for the owner and what comes next). Everything is
// optional: without network, gh or origin/dev, whatever cannot be known is left out, and the hook never
// fails or takes more than a few seconds.
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

function run(command, args, ms = 2500) {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: ms }).trim();
  } catch {
    return "";
  }
}

// Context text from data already collected (separate so it can be tested).
export function format({ branch, commit, pr, plans = [], uncommitted = 0, plansSummary = "" }) {
  if (!branch && !commit) return "";
  const lines = [];
  if (!branch) {
    // Detached HEAD (for example, a PR's CI): there is no branch or PR to show.
    lines.push(`Detached HEAD at ${commit}: there is no current branch; commits go on a work branch.`);
  } else if (branch === "main" || branch === "dev") {
    lines.push(`Current branch: ${branch}, a protected branch: commits go on a work branch created from an up-to-date dev (git switch -c <type>/<topic>).`);
  } else {
    lines.push(`Current branch: ${branch}.`);
  }
  if (pr) lines.push(`Open PR: #${pr.number} «${pr.title}» against ${pr.baseRefName} (${pr.url}).`);
  else if (branch && branch !== "main" && branch !== "dev") lines.push("This branch has no open PR (or it could not be checked); that is normal while the milestone is in progress: the PR is opened when it is done.");
  if (plans.length) lines.push(`Plans touched by this branch: ${plans.join(", ")}.`);
  if (uncommitted > 0) lines.push(`Uncommitted changes: ${uncommitted} file(s).`);
  if (plansSummary) lines.push(plansSummary);
  lines.push("Reading the project status is optional: docs/status/ describes what is done in each area.");
  return lines.join("\n");
}

export function collect(cwd = process.cwd()) {
  const git = (...args) => run("git", ["-C", cwd, ...args]);
  const branch = git("branch", "--show-current");
  const commit = branch ? "" : git("rev-parse", "--short", "HEAD");
  let pr = null;
  if (branch && branch !== "main" && branch !== "dev") {
    const json = run("gh", ["pr", "list", "--head", branch, "--state", "open", "--json", "number,title,baseRefName,url", "--limit", "1"], 3000);
    try {
      pr = JSON.parse(json || "[]")[0] ?? null;
    } catch {
      pr = null;
    }
  }
  const diff = git("diff", "--name-only", "origin/dev...HEAD");
  const plans = diff
    .split("\n")
    .filter((p) => p.startsWith("docs/plans/") && p.endsWith(".md"))
    .map((p) => p.split("/").pop());
  const uncommitted = git("status", "--porcelain").split("\n").filter(Boolean).length;
  return { branch, commit, pr, plans, uncommitted };
}

// Summary of the active plans; empty if the script does not exist or fails (never blocks the start).
export async function summarizePlans(cwd = process.cwd()) {
  try {
    const root = run("git", ["-C", cwd, "rev-parse", "--show-toplevel"]) || cwd;
    const mod = await import(pathToFileURL(`${root}/scripts/plan-status.mjs`).href);
    return mod.summaryText(mod.loadPlans(root).plans);
  } catch {
    return "";
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    let input = "";
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) input += chunk;
    const cwd = (() => {
      try {
        return JSON.parse(input).cwd || process.cwd();
      } catch {
        return process.cwd();
      }
    })();
    const text = format({ ...collect(cwd), plansSummary: await summarizePlans(cwd) });
    if (text) console.log(text);
  } catch {
    // Never block the start of the session.
  }
}
