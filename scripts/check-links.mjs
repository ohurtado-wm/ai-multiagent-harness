#!/usr/bin/env node
// Checks that the relative links in the repository's .md files point to files that exist.
// Usage: node scripts/check-links.mjs   (exit code 1 if there are broken links)
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignore = new Set([".git", "node_modules", "DerivedData", ".build", ".next", "build", "dist", ".gradle", ".temp"]);

function* markdownFiles(dir) {
  for (const name of readdirSync(dir)) {
    if (ignore.has(name)) continue;
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) yield* markdownFiles(path);
    else if (name.endsWith(".md")) yield path;
  }
}

// Markdown links: [text](target) and [text](target "title"), without remote images or bare anchors.
const link = /\]\(([^)\s#]+)(?:#[^)\s]*)?(?:\s+"[^"]*")?\)/g;
let broken = 0;
let checked = 0;

for (const file of markdownFiles(root)) {
  const text = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, ""); // without code blocks
  for (const [, target] of text.matchAll(link)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("/")) continue; // http:, mailto:, absolute paths
    if (target.includes("<") || target.includes(">")) continue; // template placeholders such as <path>
    checked++;
    if (!existsSync(normalize(join(dirname(file), decodeURIComponent(target))))) {
      broken++;
      console.error(`BROKEN  ${relative(root, file)} -> ${target}`);
    }
  }
}

console.log(`${checked} links checked, ${broken} broken.`);
process.exit(broken > 0 ? 1 : 0);
