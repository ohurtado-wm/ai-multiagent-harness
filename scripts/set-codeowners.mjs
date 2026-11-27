#!/usr/bin/env node
// Sets the owner of every rule in .github/CODEOWNERS to one user or team. Comments and blank lines are
// kept, and so is each rule's path. Used by scripts/setup-new-repo.sh so a repository created from the
// template does not inherit the template owner.
//
// Usage: node scripts/set-codeowners.mjs <@user | @org/team> [path to CODEOWNERS]
// Exit code 1 on an invalid handle or a missing file.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// @user (GitHub logins: letters, digits, single hyphens) or @org/team (team slugs also allow _ and .).
const HANDLE = /^@[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)?$/;

export function validHandle(handle) {
  return typeof handle === "string" && HANDLE.test(handle);
}

// Returns { text, changed } with every rule's owners replaced by `handle`.
export function setOwner(text, handle) {
  if (!validHandle(handle)) throw new Error(`«${handle}» is not a GitHub user (@name) or team (@org/team).`);
  let changed = 0;
  const lines = text.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const path = trimmed.split(/\s+/)[0];
    const next = `${path} ${handle}`;
    if (next !== line) changed++;
    return next;
  });
  return { text: lines.join("\n"), changed };
}

function main() {
  const [handle, file] = process.argv.slice(2);
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const path = file ?? join(root, ".github/CODEOWNERS");
  try {
    const { text, changed } = setOwner(readFileSync(path, "utf8"), handle);
    writeFileSync(path, text);
    console.log(changed ? `CODEOWNERS: ${changed} rule(s) now owned by ${handle}.` : `CODEOWNERS: already owned by ${handle}.`);
  } catch (error) {
    console.error(`set-codeowners: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
