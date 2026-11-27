#!/usr/bin/env node
// PreToolUse hook (Bash and Edit|Write|MultiEdit) for agent teams and subagents.
// It only acts when the call carries `agent_id` (it comes from a subagent or a teammate);
// the main session (the coordinator) is not affected. It blocks with exit code 2 and the message on stderr:
//   - git that writes history or changes branch (commit, push, merge, rebase, reset, switch, branch
//     checkout, stash, tag, cherry-pick, revert, worktree, pull) and gh pr create/merge/edit/close: the only
//     git author is the coordinator. `git checkout -- <file>` and `git restore` are allowed.
//   - editing the harness configuration (.claude/settings*.json, .claude/hooks/**).
//   - the documenter editing outside docs/**, PROJECT_MAP.md, HARNESS.md and the AGENTS.md files.
//   - resetting the local database (supabase db reset, prisma migrate reset, npm run db:reset): it wipes the
//     owner's test data; the coordinator decides that with the owner.
//   - for the team roles (coder, qa, pr-reviewer, documenter): regression tests (scripts/e2e-*.sh,
//     scripts/integration-*.sh, scripts/regression-*.sh without ONLY= or TEST=) without the
//     REGRESSIONS_APPROVED=1 flag the coordinator sets once the owner agreed, and the native mobile
//     toolchain (xcodebuild, simctl, swift test, gradlew, scripts/mobile-*.sh) when the diff does not touch
//     the mobile area according to `scripts/verify.sh --areas`.
// On a parsing error it lets the call through.
import { spawnSync } from "node:child_process";
import { basename, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { segment } from "./git-guard.mjs";

const GIT_WRITES = new Set(["commit", "push", "merge", "rebase", "reset", "switch", "stash", "tag", "cherry-pick", "revert", "worktree", "am", "pull"]);
const GH_PR = new Set(["create", "merge", "edit", "close", "reopen"]);
const TEAM_ROLES = new Set(["coder", "qa", "pr-reviewer", "documenter"]);
const REGRESSION = /^(e2e|integration|regression)-.*\.sh$/;
const MOBILE_AREAS = ["mobile"];

const author =
  "The only git author of the team is the coordinator (the main session). Finish your task and message them which files you changed; they make the commit.";

function evaluateGit(args) {
  let i = 0;
  while (i < args.length && args[i].startsWith("-")) i += args[i] === "-C" || args[i] === "-c" ? 2 : 1;
  const sub = args[i];
  const rest = args.slice(i + 1);
  if (GIT_WRITES.has(sub)) return `«git ${sub}» is not allowed from a subagent or teammate. ${author}`;
  // checkout: only restoring files (with --), never switching or creating branches.
  if (sub === "checkout" && !rest.includes("--")) {
    return `Switching branches with «git checkout» is not allowed from a subagent or teammate. To discard changes to a file use «git checkout -- <file>» or «git restore <file>». ${author}`;
  }
  if (sub === "branch" && rest.some((a) => !a.startsWith("-") || ["-d", "-D", "-m", "-M", "-c", "-C", "--delete", "--move", "--copy"].includes(a))) {
    if (!rest.every((a) => ["-a", "-r", "-v", "-vv", "--list", "--show-current", "--all", "--remotes"].includes(a))) {
      return `Creating, deleting or renaming branches is not allowed from a subagent or teammate. ${author}`;
    }
  }
  return null;
}

const dbReset =
  "Resetting the local database wipes the data the owner uses for testing. Do not run it: tell the coordinator why you need it and they will ask the owner. To apply a new migration without wiping anything, apply pending migrations (for example «supabase migration up --local» or «prisma migrate deploy»).";
const regression = (name) =>
  `«${name}» is a regression test: only with the owner's permission. Ask the coordinator, saying which one it is and how long it takes; if the owner agrees, they will tell you to run it with REGRESSIONS_APPROVED=1 in front.`;
const platform = (what, areas) =>
  `This change does not touch ${what} (diff areas according to scripts/verify.sh --areas: ${[...areas].join(", ") || "none"}), so its tests are not run and its app is not built. Validate only the diff areas with «scripts/verify.sh». If it is really needed, ask the coordinator.`;

function isDbReset(cmd, args) {
  if (cmd === "supabase" && args.includes("db") && args[args.indexOf("db") + 1] === "reset") return true;
  if (cmd === "prisma" && args[0] === "migrate" && args[1] === "reset") return true;
  if (["npm", "pnpm", "yarn", "bun"].includes(cmd) && args.some((a) => /^db:reset$/.test(a))) return true;
  return false;
}

// What kind of command it is: regression, mobile or nothing. A regression script with ONLY= or TEST=
// is focused (one class or one test, AGENTS.md «Fast tests and regression tests»): it needs no
// permission, but it still follows the platform rule.
function kind(cmd, args, vars = new Set()) {
  const name = basename(cmd);
  const focused = [...vars].some((v) => /^(ONLY|TEST)=\S/.test(v));
  if (REGRESSION.test(name) && !focused) return { type: "regression", name };
  if (cmd === "xcodebuild" || (cmd === "xcrun" && args[0] === "simctl") || (cmd === "swift" && args[0] === "test") || name === "gradlew" || /^mobile-.*\.sh$/.test(name)) {
    return { type: "mobile", name: cmd };
  }
  if (name === "verify.sh" && args.some((a) => MOBILE_AREAS.includes(a) || a === "all")) return { type: "mobile", name: "scripts/verify.sh" };
  return null;
}

// context: { team: bool (team role), areas: () => Set of diff areas, or null if unknown }
export function evaluateCommand(command, context = {}) {
  for (const words of segment(command)) {
    let p = words.slice();
    const vars = new Set();
    while (p.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(p[0]) || ["sudo", "command", "exec", "time", "nohup", "env", "npx"].includes(p[0]))) {
      if (p[0].includes("=")) vars.add(p[0]);
      p.shift();
    }
    if (!p.length) continue;
    let [cmd, ...args] = p;
    let block = null;
    if (["bash", "sh", "zsh"].includes(cmd)) {
      const k = args.findIndex((a) => /^-[a-z]*c$/.test(a));
      if (k >= 0 && args[k + 1]) block = evaluateCommand(args[k + 1], context);
      else if (args[0] && !args[0].startsWith("-")) [cmd, ...args] = args;
    }
    if (!block && cmd === "git") block = evaluateGit(args);
    else if (!block && cmd === "gh" && args[0] === "pr" && GH_PR.has(args[1])) {
      block = `«gh pr ${args[1]}» is not allowed from a subagent or teammate. ${author}`;
    } else if (!block && isDbReset(cmd, args)) {
      block = dbReset;
    } else if (!block && context.team) {
      const k = kind(cmd, args, vars);
      if (k?.type === "regression" && !vars.has("REGRESSIONS_APPROVED=1")) block = regression(k.name);
      else if (k?.type === "mobile") {
        const areas = context.areas?.();
        if (areas && !MOBILE_AREAS.some((a) => areas.has(a))) block = platform("the mobile app", areas);
      }
    }
    if (block) return block;
  }
  return null;
}

// Areas that changed against origin/dev, with the same rule as scripts/verify.sh. null if unknown.
export function diffAreas(root) {
  const r = spawnSync("bash", [join(root, "scripts/verify.sh"), "--areas"], { cwd: root, encoding: "utf8", timeout: 20000 });
  if (r.status !== 0) return null;
  return new Set(r.stdout.split("\n").map((l) => l.trim()).filter((a) => /^[a-z-]+$/.test(a)));
}

const documenterOwns = (path) =>
  path.startsWith("docs/") || ["PROJECT_MAP.md", "AGENTS.md", "HARNESS.md"].includes(path) || path.endsWith("/AGENTS.md");

export function evaluateEdit(file, agent, root) {
  if (typeof file !== "string") return null;
  const path = relative(root, resolve(root, file)).split("\\").join("/");
  if (/^\.claude\/settings(\.local)?\.json$/.test(path) || path.startsWith(".claude/hooks/")) {
    return `«${path}» is harness configuration: a subagent or teammate does not change it. Ask the coordinator, who checks with the owner.`;
  }
  if (agent === "documenter" && !documenterOwns(path)) {
    return `The documenter only edits docs/**, PROJECT_MAP.md, HARNESS.md and the AGENTS.md files; «${path}» belongs to another role. Tell the coordinator which change is needed.`;
  }
  return null;
}

// Returns the block message or null. `data` is the hook input.
export function evaluate(data, root, options = {}) {
  if (!data?.agent_id) return null;
  const input = data.tool_input ?? {};
  if (data.tool_name === "Bash") {
    if (typeof input.command !== "string") return null;
    let cache;
    const areas = options.areas ?? (() => (cache === undefined ? (cache = diffAreas(root)) : cache));
    return evaluateCommand(input.command, { team: TEAM_ROLES.has(data.agent_type), areas });
  }
  if (["Edit", "Write", "MultiEdit"].includes(data.tool_name)) return evaluateEdit(input.file_path, data.agent_type, root);
  return null;
}

async function main() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  try {
    const data = JSON.parse(text);
    const root = process.env.CLAUDE_PROJECT_DIR ?? data.cwd ?? process.cwd();
    const message = evaluate(data, root);
    if (message) {
      console.error(`Blocked by .claude/hooks/team-guard.mjs. ${message}`);
      process.exit(2);
    }
  } catch (error) {
    console.error(`team-guard: could not parse the call (${error.message}); letting it through.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
