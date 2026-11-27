#!/usr/bin/env node
// PreToolUse hook (Bash): enforces rules 1-3 of AGENTS.md and prevents two common accidents.
// Blocks (exit code 2, with the correct flow on stderr):
//   - git commit on main or dev; git push to main or dev (and force pushes to them);
//   - git merge/rebase/reset --hard while on main;
//   - gh pr create without --base dev; gh pr edit --base main; gh pr merge of a PR whose base is main;
//   - recursive forced rm outside build folders;
//   - reading .env or .env.* from the terminal (.env.example is allowed).
// On a parsing error it lets the command through with a warning: a hook failure must not stall the work.
// It only protects inside Claude Code; it does not replace server-side branch protection.
import { execFileSync } from "node:child_process";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PROTECTED = ["main", "dev"];
const INTEGRATION = "dev";
const READERS = new Set(["cat", "less", "more", "head", "tail", "bat", "nl", "tac", "source", ".", "xxd", "od", "strings", "grep", "rg", "awk", "sed", "cut", "sort", "uniq", "base64"]);
const BUILD_FOLDERS = /^(\.next.*|\.build|build|dist|DerivedData|node_modules|\.gradle|\.swiftpm|\.turbo|coverage)$/;

// Splits a command into segments (by && || ; | & newlines and parentheses outside quotes)
// and each segment into unquoted words.
export function segment(command) {
  const segments = [];
  let words = [];
  let current = "";
  let hasWord = false;
  let quote = null;
  const closeWord = () => {
    if (hasWord) words.push(current);
    current = "";
    hasWord = false;
  };
  const closeSegment = () => {
    closeWord();
    if (words.length) segments.push(words);
    words = [];
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === "\\" && quote === '"' && i + 1 < command.length) current += command[++i];
      else current += c;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      hasWord = true;
    } else if (c === "\\" && i + 1 < command.length) {
      current += command[++i];
      hasWord = true;
    } else if (c === " " || c === "\t") {
      closeWord();
    } else if (c === "\n" || c === ";" || c === "&" || c === "|" || c === "(" || c === ")" || c === "`") {
      closeSegment();
    } else {
      current += c;
      hasWord = true;
    }
  }
  closeSegment();
  return segments;
}

function defaultBranch(dir) {
  if (process.env.GUARD_BRANCH !== undefined) return process.env.GUARD_BRANCH;
  try {
    return execFileSync("git", ["-C", dir, "branch", "--show-current"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function defaultPrBase(dir, number) {
  try {
    const args = ["pr", "view", ...(number ? [number] : []), "--json", "baseRefName", "-q", ".baseRefName"];
    return execFileSync("gh", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 8000 }).trim();
  } catch {
    return "";
  }
}

const flow = (branch) =>
  `Create a work branch from an up-to-date ${INTEGRATION} (git switch ${INTEGRATION} && git pull && git switch -c <type>/<topic>), commit there and open the PR against ${INTEGRATION}. You are on «${branch}».`;

function evaluateGit(args, dir, ctx) {
  // Global git options: -C <path>, -c k=v, and the ones without a value.
  let i = 0;
  while (i < args.length && args[i].startsWith("-")) {
    if (args[i] === "-C" && args[i + 1]) {
      dir = resolve(dir, args[i + 1]);
      i += 2;
    } else if (args[i] === "-c" || args[i] === "--git-dir" || args[i] === "--work-tree" || args[i] === "--namespace") {
      i += 2;
    } else i += 1;
  }
  const sub = args[i];
  const rest = args.slice(i + 1);
  const branch = ctx.branchOf(dir);

  if (sub === "commit" && PROTECTED.includes(branch)) {
    return `Rule 1: no direct commits to «${branch}». ${flow(branch)}`;
  }
  if (sub === "push") {
    const forced = rest.some((a) => a === "-f" || a === "--force" || a.startsWith("--force-with-lease") || a === "--force-if-includes" || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(a));
    if (rest.includes("--all") || rest.includes("--mirror")) {
      return "Rule 2: do not use --all or --mirror, they also push main and dev. Push only your work branch (git push -u origin <branch>).";
    }
    const positional = rest.filter((a) => !a.startsWith("-"));
    const refspecs = positional.slice(1); // the first one is the remote
    const targets = (refspecs.length ? refspecs : [branch]).map((r) => {
      const dest = r.includes(":") ? r.split(":").pop() : r.replace(/^\+/, "");
      const clean = dest.replace(/^\+/, "").replace(/^refs\/heads\//, "");
      return clean === "HEAD" ? branch : clean;
    });
    const plus = refspecs.some((r) => r.startsWith("+"));
    const hit = targets.find((d) => PROTECTED.includes(d));
    if (hit) {
      return `Rule 2: no push to «${hit}»${forced || plus ? " (let alone a forced one)" : ""}. Push your work branch (git push -u origin <branch>) and open the PR against ${INTEGRATION}; promoting ${INTEGRATION} to main is done by a person.`;
    }
  }
  if (branch === "main" && (sub === "merge" || sub === "rebase" || (sub === "reset" && rest.includes("--hard")))) {
    return `Rule 2: no ${sub} while on «main». Switch to a work branch (git switch -c <type>/<topic> from ${INTEGRATION}).`;
  }
  return null;
}

function evaluateGh(args, dir, ctx) {
  const [area, action, ...rest] = args;
  const value = (...names) => {
    for (let k = 0; k < rest.length; k++) {
      for (const n of names) {
        if (rest[k] === n) return rest[k + 1];
        if (rest[k].startsWith(`${n}=`)) return rest[k].slice(n.length + 1);
      }
    }
    return undefined;
  };
  if (area === "pr" && action === "create" && value("--base", "-B") !== INTEGRATION) {
    return `Rule 3: PRs are always opened against ${INTEGRATION}. Add --base ${INTEGRATION} (promoting ${INTEGRATION} to main is done by a person).`;
  }
  if (area === "pr" && action === "edit" && value("--base", "-B") === "main") {
    return `Rule 3: a work PR cannot target main. Use --base ${INTEGRATION}.`;
  }
  if (area === "pr" && action === "merge") {
    const number = rest.find((a) => /^\d+$/.test(a) || /\/pull\/\d+/.test(a));
    if (ctx.prBase(dir, number) === "main") {
      return `Rule 2: PRs into main are not merged by agents; promoting ${INTEGRATION} to main is done by a person.`;
    }
  }
  return null;
}

function evaluateRm(args) {
  let recursive = false;
  let force = false;
  const paths = [];
  for (const a of args) {
    if (a === "--recursive") recursive = true;
    else if (a === "--force") force = true;
    else if (/^-[a-zA-Z]+$/.test(a)) {
      if (/[rR]/.test(a)) recursive = true;
      if (a.includes("f")) force = true;
    } else if (!a.startsWith("-")) paths.push(a);
  }
  if (!(recursive && force)) return null;
  const safe = paths.length > 0 && paths.every((p) => BUILD_FOLDERS.test(basename(p.replace(/\/+$/, ""))));
  if (safe) return null;
  return "No recursive forced rm outside build folders (.next*, .build, build, dist, DerivedData, node_modules). Delete specific files with rm without -rf, or ask the owner.";
}

function evaluateRead(cmd, args) {
  if (!READERS.has(cmd)) return null;
  const secret = args.find((a) => !a.startsWith("-") && /^\.env(\..+)?$/.test(basename(a)) && !/\.example$/.test(a));
  if (secret) {
    return `Secrets are not read from the terminal («${secret}»). To see which variables exist, read .env.example.`;
  }
  return null;
}

// Returns the block message, or null if the command can run.
export function evaluate(command, options = {}) {
  const ctx = {
    branchOf: options.branchOf ?? defaultBranch,
    prBase: options.prBase ?? defaultPrBase,
  };
  let dir = resolve(options.cwd ?? process.cwd());
  for (const words of segment(command)) {
    // Strip environment assignments and wrappers that do not change the command.
    const p = words.slice();
    while (p.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(p[0]) || ["sudo", "command", "exec", "time", "nohup"].includes(p[0]))) p.shift();
    if (!p.length) continue;
    const [cmd, ...args] = p;
    let block = null;
    if (cmd === "cd" && args[0]) {
      dir = resolve(dir, args[0]);
      continue;
    }
    if (["bash", "sh", "zsh"].includes(cmd)) {
      const k = args.findIndex((a) => /^-[a-z]*c$/.test(a));
      if (k >= 0 && args[k + 1]) block = evaluate(args[k + 1], { ...options, cwd: dir });
    } else if (cmd === "git") block = evaluateGit(args, dir, ctx);
    else if (cmd === "gh") block = evaluateGh(args, dir, ctx);
    else if (cmd === "rm") block = evaluateRm(args);
    else block = evaluateRead(cmd, args);
    if (block) return block;
  }
  return null;
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  try {
    const data = JSON.parse(input);
    const command = data?.tool_input?.command;
    if (typeof command !== "string") return;
    const message = evaluate(command, { cwd: data.cwd });
    if (message) {
      console.error(`Blocked by .claude/hooks/git-guard.mjs. ${message}`);
      process.exit(2);
    }
  } catch (error) {
    console.error(`git-guard: could not parse the command (${error.message}); letting it through.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
