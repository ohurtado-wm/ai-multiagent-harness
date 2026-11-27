#!/usr/bin/env node
// PreToolUse hook (Edit|Write|MultiEdit): blocks hand-editing generated files and says which source to
// edit and which command to run. Exit code 2 with the message on stderr.
// To extend it: add an entry to GENERATED (whole files) or BLOCKS (a generated BEGIN/END block inside
// a hand-written file, for example fixtures embedded in a SQL test) when a new generator appears.
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const CONFIG = {
  // Whole generated files.
  generated: [
    {
      path: "packages/ui/src/tokens.css",
      source: "shared/design/tokens.json",
      command: "npm run tokens",
    },
  ],
  // Files with a generated BEGIN/END block: only that block is protected. Example entry:
  //   { path: "backend/tests/fixtures.test.sql", start: "-- BEGIN generated fixtures",
  //     end: "-- END generated fixtures", command: "node scripts/generate-fixtures.mjs",
  //     source: "shared/fixtures/<name>.json" }
  blocks: [],
};

const message = (relPath, source, command) =>
  `«${relPath}» is a generated file: it is not edited by hand. Edit ${source} and run «${command}».`;

// Region of the file that the source's script generates.
function generatedBlock(text, START, END) {
  const i = text.indexOf(START);
  const j = text.indexOf(END);
  return i < 0 || j < 0 ? null : text.slice(i, j + END.length);
}

// Returns the block message or null. `read` and `config` allow testing without touching the disk.
export function evaluate(tool, input, root, read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : ""), config = CONFIG) {
  const file = input?.file_path;
  if (typeof file !== "string") return null;
  const relPath = relative(root, resolve(root, file)).split("\\").join("/");

  const g = config.generated.find((x) => x.path === relPath);
  if (g) return message(relPath, g.source, g.command);

  const b = config.blocks.find((x) => x.path === relPath);
  if (b) {
    const { command, source, start: START, end: END } = b;
    const current = read(resolve(root, file));
    const block = generatedBlock(current, START, END);
    if (!block) return null;
    if (tool === "Write") {
      return generatedBlock(input.content ?? "", START, END) === block ? null : message(`${relPath} (BEGIN/END block)`, source, command);
    }
    const edits = tool === "MultiEdit" ? input.edits ?? [] : [input];
    for (const e of edits) {
      const old = e.old_string ?? "";
      if (old && (block.includes(old) || old.includes(START) || old.includes(END))) {
        return message(`${relPath} (BEGIN/END block)`, source, command);
      }
    }
  }
  return null;
}

async function main() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  try {
    const data = JSON.parse(text);
    const root = process.env.CLAUDE_PROJECT_DIR ?? data.cwd ?? process.cwd();
    const warning = evaluate(data.tool_name, data.tool_input, root);
    if (warning) {
      console.error(`Blocked by .claude/hooks/generated-guard.mjs. ${warning}`);
      process.exit(2);
    }
  } catch (error) {
    console.error(`generated-guard: could not parse the edit (${error.message}); letting it through.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
