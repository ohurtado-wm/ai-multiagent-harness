import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { evaluate, segment } from "./git-guard.mjs";

// Simulated branch per directory: the main checkout is on `branch`, the worktree «/other» on «feature/x».
const withBranch = (branch, base = "dev") => ({
  cwd: "/repo",
  branchOf: (dir) => (dir === "/other" ? "feature/x" : branch),
  prBase: () => base,
});

const blocks = (command, branch, base) => assert.ok(evaluate(command, withBranch(branch, base)), `should block: ${command} (${branch})`);
const allows = (command, branch, base) => assert.equal(evaluate(command, withBranch(branch, base)), null, `should allow: ${command} (${branch})`);

test("commit is only blocked on main and dev", () => {
  blocks("git commit -m x", "main");
  blocks("git commit -am x", "dev");
  blocks("git commit --amend", "dev");
  blocks("git add . && git commit -m x", "dev");
  allows("git commit -m x", "chore/harness");
  allows("git commit -m x", "feature/phase-3-x");
});

test("the commit message does not count as a command", () => {
  allows('git commit -m "git push origin main"', "chore/x");
  allows('git log --grep="commit"', "dev");
  allows('echo "git push origin main"', "dev");
  allows("git status", "main");
});

test("push to main or dev, explicit, implicit or forced", () => {
  blocks("git push origin main", "chore/x");
  blocks("git push origin dev", "chore/x");
  blocks("git push origin HEAD:main", "chore/x");
  blocks("git push origin HEAD:refs/heads/dev", "chore/x");
  blocks("git push", "dev");
  blocks("git push origin", "main");
  blocks("git push origin HEAD", "dev");
  blocks("git push --force origin main", "chore/x");
  blocks("git push -f origin chore/x:main", "chore/x");
  blocks("git push origin +main", "chore/x");
  blocks("git push --all", "chore/x");
  blocks("git push --mirror origin", "chore/x");
  allows("git push -u origin chore/harness", "chore/harness");
  allows("git push", "chore/harness");
  allows("git push origin HEAD", "chore/harness");
  allows("git push --force-with-lease origin chore/harness", "chore/harness");
  allows("git push origin chore/dev-tools", "chore/x");
});

test("merge, rebase and reset --hard are only blocked on main", () => {
  blocks("git merge dev", "main");
  blocks("git rebase dev", "main");
  blocks("git reset --hard HEAD~1", "main");
  allows("git merge dev", "chore/x");
  allows("git reset --hard HEAD~1", "chore/x");
  allows("git reset --soft HEAD~1", "main");
});

test("gh pr create requires --base dev", () => {
  blocks("gh pr create --title x", "chore/x");
  blocks("gh pr create --base main --title x", "chore/x");
  blocks("gh pr create -B main", "chore/x");
  blocks("gh pr create --base=main", "chore/x");
  allows("gh pr create --base dev --title x", "chore/x");
  allows("gh pr create -B dev --title x", "chore/x");
  allows("gh pr create --base=dev --title x", "chore/x");
  allows("gh pr view 52", "chore/x");
});

test("gh pr edit --base main and gh pr merge into main", () => {
  blocks("gh pr edit 52 --base main", "chore/x");
  allows("gh pr edit 52 --base dev", "chore/x");
  allows("gh pr edit 52 --title new", "chore/x");
  blocks("gh pr merge 52 --squash", "chore/x", "main");
  allows("gh pr merge 52 --squash", "chore/x", "dev");
  allows("gh pr merge 52", "chore/x", ""); // base unknown: let it through
});

test("the branch is computed where the command runs", () => {
  blocks("git commit -m x", "dev");
  allows("cd /other && git commit -m x", "dev");
  allows("git -C /other commit -m x", "dev");
  blocks("git -C /repo commit -m x", "dev");
  blocks("cd /other; cd /repo && git commit -m x", "dev");
});

test("recursive forced rm", () => {
  blocks("rm -rf src", "dev");
  blocks("rm -fr src", "dev");
  blocks("rm -r -f src", "dev");
  blocks("rm --recursive --force src", "dev");
  blocks("rm -Rf /", "dev");
  blocks("rm -rf node_modules src", "dev");
  allows("rm -rf node_modules", "dev");
  allows("rm -rf .next-verify .build dist", "dev");
  allows("rm -rf apps/web/build", "dev");
  allows("rm file.txt", "dev");
  allows("rm -f file.txt", "dev");
  allows("rm -r folder-without-force", "dev");
});

test("reading secrets from the terminal", () => {
  blocks("cat .env", "dev");
  blocks("cat apps/web/.env.local", "dev");
  blocks("head -5 .env.production", "dev");
  blocks("source .env", "dev");
  blocks("grep KEY .env", "dev");
  allows("cat apps/web/.env.example", "dev");
  allows("git add .env.example", "dev");
  allows("echo .env", "dev");
  allows("cat README.md", "dev");
});

test("bash -c and chained commands", () => {
  blocks('bash -c "git commit -m x"', "dev");
  blocks("FOO=1 git commit -m x", "dev");
  blocks("sudo git push origin main", "chore/x");
  blocks("npm test | tee x; git push origin main", "chore/x");
  allows('bash -c "npm run lint"', "dev");
});

test("segment respects quotes", () => {
  assert.deepEqual(segment('git commit -m "a && b" && git push'), [["git", "commit", "-m", "a && b"], ["git", "push"]]);
  assert.deepEqual(segment("echo 'x;y'; ls"), [["echo", "x;y"], ["ls"]]);
});

test("CLI: exits 2 with a message, or 0 if allowed; broken JSON does not block", () => {
  const run = (input, branch) =>
    spawnSync("node", [new URL("./git-guard.mjs", import.meta.url).pathname], { input, encoding: "utf8", env: { ...process.env, GUARD_BRANCH: branch } });
  const bad = run(JSON.stringify({ tool_input: { command: "git commit -m x" }, cwd: "/repo" }), "dev");
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /Rule 1/);
  const good = run(JSON.stringify({ tool_input: { command: "git commit -m x" }, cwd: "/repo" }), "chore/x");
  assert.equal(good.status, 0);
  const broken = run("not json", "dev");
  assert.equal(broken.status, 0);
  assert.match(broken.stderr, /letting it through/);
});
