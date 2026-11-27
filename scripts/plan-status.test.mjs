import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { END, START, applyTable, card, children, generateTable, inOrder, loadPlans, readPlan, short, summaryText } from "./plan-status.mjs";

function testRoot(plans) {
  const root = mkdtempSync(join(tmpdir(), "plans-"));
  for (const [path, text] of Object.entries(plans)) {
    const file = join(root, "docs/plans", path);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, text);
  }
  return root;
}

const plan = (title, header) => `---\n${Object.entries(header).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n\n# ${title}\n`;

// A phase with three chained milestones, a loose adjustment and what comes next without a plan.
const PHASE = {
  "product/PLAN_PRODUCT.md": plan("Plan — Product", { status: "in-progress" }),
  "product/phase-1/PHASE.md": plan("Plan — Product, phase 1: base", { status: "in-progress", parent: "PLAN_PRODUCT.md", next: "Phase 2 (no plan yet)" }),
  "product/phase-1/M2.md": plan("Plan — Product, phase 1, milestone 2: b", { status: "in-progress", parent: "PHASE.md", previous: "M1.md", next: "M3.md" }),
  "product/phase-1/M1.md": plan("Plan — Product, phase 1, milestone 1: a", { status: "closed", parent: "PHASE.md", next: "M2.md" }),
  "product/phase-1/M3.md": plan("Plan — Product, phase 1, milestone 3: c", { status: "draft", parent: "PHASE.md", previous: "M2.md" }),
  "product/phase-1/ADJUSTMENT.md": plan("Plan — Product, phase 1 (adjustment): d", { status: "in-validation", parent: "PHASE.md" }),
};

test("readPlan takes status, parent, previous and next from the header and the title from the first #", () => {
  assert.deepEqual(readPlan('---\nstatus: in-progress\nparent: P.md\nnext: "Milestone 8 (no plan yet)"\n---\n\n# Plan A\n'), {
    status: "in-progress",
    title: "Plan A",
    parent: "P.md",
    previous: undefined,
    next: "Milestone 8 (no plan yet)",
    issue: undefined,
  });
  assert.equal(readPlan("# No header\n").status, undefined);
  assert.equal(readPlan("---\nstatus: draft\nissue: 120\n---\n\n# Plan B\n").issue, "120");
});

test("short removes the repeated prefix from the title", () => {
  assert.equal(short("Plan — Product, phase 3, milestone 7: mobile"), "Product, phase 3, milestone 7: mobile");
  assert.equal(short("Plan: harness"), "harness");
});

test("a consistent hierarchy gives no errors and orders children by the chain, loose ones last", () => {
  const { plans, errors } = loadPlans(testRoot(PHASE));
  assert.deepEqual(errors, []);
  assert.deepEqual(children(plans, "PHASE.md").map((p) => p.file), ["M1.md", "M2.md", "M3.md", "ADJUSTMENT.md"]);
  assert.deepEqual(inOrder(plans).map((p) => p.file), ["PLAN_PRODUCT.md", "PHASE.md", "M1.md", "M2.md", "M3.md", "ADJUSTMENT.md"]);
});

test("generateTable writes «Now» (in progress, waiting for the owner, next) and the nested tree", () => {
  const { table, errors } = generateTable(testRoot(PHASE));
  assert.deepEqual(errors, []);
  // Only the milestone in progress, not its parents in progress.
  assert.match(table, /\*\*In progress\*\*[^]*- \[Product, phase 1, milestone 2: b\]\(\.\.\/plans\/product\/phase-1\/M2\.md\) — of \[Product, phase 1: base\]/);
  assert.doesNotMatch(table.split("**Waiting")[0], /- \[Product\]\(/);
  assert.match(table, /- \[Product, phase 1: base\]\(\.\.\/plans\/product\/phase-1\/PHASE\.md\): \[Product, phase 1 \(adjustment\): d\]/);
  assert.match(table, /- After \[Product, phase 1, milestone 2: b\][^\n]*: \[Product, phase 1, milestone 3: c\][^\n]* \(draft\)/);
  assert.match(table, /- After \[Product, phase 1: base\][^\n]*: Phase 2 \(no plan yet\)/);
  assert.match(table, /\n- \[Product\]\(\.\.\/plans\/product\/PLAN_PRODUCT\.md\) · in-progress\n {2}- \[Product, phase 1: base\][^\n]* · in-progress\n {4}- \[Product, phase 1, milestone 1: a\][^\n]* · closed/);
});

test("loadPlans reports missing or invalid status, missing parent, non-reciprocal chains, repeated names and cycles", () => {
  const { errors } = loadPlans(
    testRoot({
      "NONE.md": "# No header\n",
      "BAD.md": plan("Bad", { status: "finished" }),
      "ORPHAN.md": plan("Orphan", { status: "closed", parent: "DOES_NOT_EXIST.md" }),
      "A.md": plan("A", { status: "closed", next: "B.md" }),
      "B.md": plan("B", { status: "closed" }),
      "C.md": plan("C", { status: "closed", next: "MISSING.md" }),
      "D.md": plan("D", { status: "closed" }),
      "other/D.md": plan("D repeated", { status: "closed" }),
      "X.md": plan("X", { status: "closed", parent: "Y.md" }),
      "Y.md": plan("Y", { status: "closed", parent: "X.md" }),
      "WITHISSUE.md": plan("With issue", { status: "draft", issue: "120" }),
      "BADISSUE.md": plan("Bad issue", { status: "draft", issue: "#120" }),
    }),
  );
  const text = errors.join("\n");
  assert.match(text, /NONE\.md: the «status:» header is missing/);
  assert.match(text, /BAD\.md: status «finished» is not valid/);
  assert.match(text, /ORPHAN\.md: «parent: DOES_NOT_EXIST\.md» is not a plan/);
  assert.match(text, /says «next: B\.md», but B\.md does not say «previous: A\.md»/);
  assert.match(text, /C\.md: «next: MISSING\.md» is not a plan/);
  assert.match(text, /the name «D\.md» is repeated/);
  assert.match(text, /X\.md: the «parent» chain forms a cycle/);
  assert.match(text, /BADISSUE\.md: «issue: #120» must be only the GitHub issue number/);
  assert.doesNotMatch(text, /WITHISSUE\.md/);
});

test("card gives status, parents, previous, next and children, and warns if the query is ambiguous", () => {
  const { plans } = loadPlans(testRoot(PHASE));
  const m2 = card(plans, "M2");
  assert.match(m2, /status: in-progress/);
  assert.match(m2, /parents: PLAN_PRODUCT\.md \(in-progress\) > PHASE\.md \(in-progress\)/);
  assert.match(m2, /previous: M1\.md \(closed\)/);
  assert.match(m2, /next: M3\.md \(draft\)/);
  assert.match(card(plans, "PHASE.md"), /children: \n {2}- M1\.md \(closed\)\n {2}- M2\.md/);
  assert.match(card(plans, "milestone"), /Several plans match/);
  assert.match(card(plans, "zzz"), /No plan matches/);
});

test("summaryText fits in a few lines: in progress, waiting for the owner by parent and what comes next", () => {
  const { plans } = loadPlans(testRoot(PHASE));
  const text = summaryText(plans);
  assert.match(text, /^Plans in progress: Product, phase 1, milestone 2: b \(M2\.md\)\.$/m);
  assert.match(text, /^Waiting for the owner \(in-validation\): 1 plan\(s\) — Product, phase 1: base: 1\.$/m);
  assert.match(text, /^What comes next: Phase 2 \(no plan yet\); Product, phase 1, milestone 3: c \(M3\.md\)\.$/m);
  assert.ok(text.split("\n").length <= 4);
});

test("applyTable replaces only what is between the markers", () => {
  const doc = `before\n${START}\nold\n${END}\nafter\n`;
  assert.equal(applyTable(doc, `${START}\nnew\n${END}`), `before\n${START}\nnew\n${END}\nafter\n`);
  assert.equal(applyTable("no markers", "x"), null);
});
