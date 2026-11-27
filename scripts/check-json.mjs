#!/usr/bin/env node
// Checks that every .json file under the given folders is well-formed JSON.
// It is the minimal contract check; plug a schema validator (for example ajv) into an npm script
// «contracts:check» and scripts/verify.sh will run it too.
// Usage: node scripts/check-json.mjs [folder…]   (default: shared). Exit code 1 if a file does not parse.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const folders = process.argv.slice(2).length ? process.argv.slice(2) : ["shared"];

function* jsonFiles(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* jsonFiles(path);
    else if (name.endsWith(".json")) yield path;
  }
}

let bad = 0;
let count = 0;
for (const folder of folders) {
  const dir = resolve(root, folder);
  if (!existsSync(dir)) continue;
  for (const file of jsonFiles(dir)) {
    count++;
    try {
      JSON.parse(readFileSync(file, "utf8"));
    } catch (error) {
      bad++;
      console.error(`INVALID  ${relative(root, file)}: ${error.message}`);
    }
  }
}
console.log(`${count} JSON files checked, ${bad} invalid.`);
process.exit(bad > 0 ? 1 : 0);
