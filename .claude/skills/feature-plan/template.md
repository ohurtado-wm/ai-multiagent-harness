---
status: draft
parent: <FILE_OF_THE_PARENT_PLAN>.md
previous: <FILE_OF_THE_PREVIOUS_MILESTONE>.md
next: <FILE_OF_THE_NEXT_MILESTONE>.md or text if it has no plan yet
issue: <GITHUB_ISSUE_NUMBER>
---
<!-- parent, previous and next are optional: delete the ones that do not apply (a standalone adjustment only carries parent).
     issue: the number of the epic (phase plan) or of the sub-issue (milestone plan) created in Step 3 of the skill.
     They are named by file; if this plan says «previous: X», X must say «next:» this file. -->

# Plan — <Product>, <phase N, milestone M>: <topic in lowercase>

Plan for <milestone M> of `<PARENT_PLAN>.md` (with a relative link to the parent plan). No dates or time estimates. Builds on <contract, previous milestones with links>. When done, **<visible result in one sentence>**.

## Status

| Block | Contents | Status |
|---|---|---|
| A | <Contract / database> | Pending |
| B | <Package or service> | Pending |
| C | <App: ...> | Pending |
| D | Tests, parity and documentation | Pending |

**Goal:** <what the person will be able to do when it is done>.

**Out of this milestone:**
- <Thing>: <milestone or phase where it arrives>.
- <Thing>: <milestone or phase where it arrives>.

## Owner decisions (<YYYY-MM-DD>)

| Topic | Decision |
|---|---|
| <Topic> | **<Decision>.** <Concrete consequence.> |

## Contract (what already exists)

Confirmed in `shared/schemas/…` before touching anything:

- `<message or event>`: <relevant fields and their meaning>.

<"No schema, database function or database test changes." or what changes and why.>

## Design

- **<Rule or decision>:** <short explanation with the why>.
- **Projection / data:** <tables, migration, order tolerance>.
- **Ported UI, not redesigned:** <source views in the functional reference>.
- **<Personal or legal data>:** <note and reference>.

## Block A — <name>

Owner: `<coder-backend | coder-web | coder-mobile | qa | documenter>`. Files: `<globs>`.

- <Verifiable task>.

Verification: `<command>`

## Block B — <name>

Owner: `<role>`. Files: `<globs>`.

- <Verifiable task>.

Verification: `<command>`

## Block C — <name>

Owner: `<role>`. Files: `<globs>`.

- <Verifiable task>.

Verification: `<command>`

## Block D — Tests, parity and documentation

**Fast tests:** <cases: happy paths, limits, errors, arrival order, rebuild>.

**Parity (values by hand):**

| # | <columns with the inputs and the expected numbers> |
|---|---|

| Concept | Expected value |
|---|---|

The test compares these numbers with the code; if they disagree, find out which one has the error before adjusting anything.

**Integration (local environment):** <scenario and what is verified>.

**UI:** <flow and screenshots in light mode; dark only if the change touches colors or themes>.

**Team validation:** <what the owner and their teammate test>.

**Documentation:** the area's file in `docs/status/` (and this plan's header —`status`, `parent`, `previous`, `next`— with `node scripts/plan-status.mjs`), `PROJECT_MAP.md` if paths change, protocol or architecture if they were clarified, and this plan's «Result» section.

## Closing criteria

1. <Checkable>.
2. <Checkable>.
3. Fast, integration and UI tests green; documentation up to date; the owner validates.

## Risks

- **<Risk>:** <mitigation>.

## Open questions

None for now. <Or the numbered list with a proposal per question.>

<!-- When done, add before "Open questions":

## Result (YYYY-MM-DD)

- <What was built per layer, with test numbers>.

### Differences from the plan

- <Each deviation and why>.

### What was not verified

- <Each thing still to be checked>.
-->
