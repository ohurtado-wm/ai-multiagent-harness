---
status: in-validation
parent: PLAN_HARNESS.md
issue: 9
---

# Harness: orchestrate teams with Claude Code or Codex

## Status

| Block | Work | Status |
|---|---|---|
| A | Shared team workflow and client entry points | Done |
| B | Owner-configurable agent models and setup skill | Done |
| C | Guardrails, documentation and verification | Done |
| D | Static site and presentation views for each coordinator | Done |

## Goal

Run the existing phase, milestone, issue and PR team workflow from either local client. A coordinator can resume another client's work from the branch, plan and GitHub PR.

The scheduled Claude issue loop, the placeholder apps and remote repository settings are outside this change.

## Owner decisions

- Add support in the template repository and use a new branch. Wait for owner validation before opening a PR.
- Provide a skill the owner can run to choose agent models.
- Keep the current Claude Code view as the initial view. Add a Codex view with Sol as its coordinator example, its native commands and instructions rooted in `AGENTS.md`. Show the model configuration skill under Skills, Team and step 9 of Adopt.

## Design

One repository workflow and set of role briefs, with separate entry points that start native Claude teammates or Codex subagents. Preserve the Claude-to-Codex writer when the plugin is available. Codex runs its writer and independent reviewer in separate subagents. Each client keeps the native model settings for its roles. The configuration skill edits the selected settings and leaves the change visible in Git.

### Block A — Team workflow

Move the common workflow to a shared guide and keep the client-specific orchestration in the two skills. Preserve scope, approval, review, handoff and publication rules. Verify links and references with `scripts/verify.sh --strict docs`.

### Block B — Skill and model settings

Add Codex agents for the four team roles. Add a configure-agents entry point for each client and one setup procedure. Verify skill discovery, native model inheritance, and selection of explicit role models.

### Block C — Guardrails and validation

Keep the existing Git and generated-file checks available to the Codex client where its hooks support them. Verify the hooks and configuration packaging with the harness tests, and document the differences between clients.

### Block D — Static site and presentation

Provide a shared client selector for the landing page and presentation. Resolve a valid `?client=` value before the saved selection, with Claude Code as the initial view. Keep existing Claude content as the default HTML. Use Codex-specific copy and diagrams where the selected runtime changes the instructions, model examples or controls. Use a single issue and PR handoff for the Codex examples. In Teams, suggest Sol for the coordinator and coders, and Terra for the documenter, QA and reviewer.

## Tests

- Run `scripts/verify.sh --strict docs` and `npm run test:harness`.
- Validate the new skills and parse the client settings. Exercise hook allow and deny behavior locally.
- Smoke-test local client discovery where available without publishing a PR. Record any remaining live-team validation separately.
- Exercise both browser views, selector, persistence, links, mobile layout and presentation navigation.

## Closing criteria

1. Either skill can start or resume the same plan, issue or PR using its own client.
2. The owner can choose the coordinator and per-role models and can configure the optional Claude-to-Codex writer.
3. Agents use the plan, Git and GitHub for handoff and report which work or checks are pending.
4. The template explains how to run each client and what is verified.

## Risks

Clients differ in permissions and hooks, and model availability depends on the installed client and account. Use supported native settings, keep protected-branch rules in GitHub, and surface unavailable models or checks.

## Result (2026-11-27)

- Shared workflow and role briefs with native entry points for Claude Code and Codex. A resumed PR enters the same readiness checks as a new PR.
- `configure-agents` in both clients updates native model defaults. The Claude bridge keeps its original default, with model, effort and enabled state configurable.
- Codex registers the shared Git and whole-file generated guards. The scheduled issue loop remains a Claude Code workflow.

- The landing page and deck share a static client selector. The URL carries the selection, browser storage remembers it, and the presentation retains the selected view and slide. Claude Code keeps the existing content and Opus example. The Codex view recommends Sol for the coordinator and coders, and Terra for the documenter, QA and reviewer. Its skill and PR examples match the Codex workflow.

### Verification

- `scripts/verify.sh --strict docs`: 4 checks passed.
- `scripts/verify.sh`: 6 checks passed and 8 were skipped because the template does not define web and backend package scripts. The same skips cause the strict web and backend checks to fail on the unchanged `dev` baseline.
- `npm run test:harness`: 75 tests passed. The Codex hook test exercises the configured commands with shell and patch payloads.
- Parsed the four skill headers, the four Codex role files and both JSON settings. Codex CLI 0.167.0 discovered both repository skills and showed its subagent tool. Its exposed tool uses prompted roles and explicit model overrides, which the Codex entry point supports.
- Chrome confirmed both client views, saved selection, direct slide navigation and the model configuration command in Adopt. Checked landing page widths of 1440, 1024, 390 and 320 px, and inspected desktop and mobile screenshots. The Teams cards and both diagrams show the requested model assignments.
- A live team run, a cross-client handoff on a real PR and account-specific model execution remain for owner validation.

## Open questions

None for implementation. The owner requested opening the PR. Live team validation remains pending.
