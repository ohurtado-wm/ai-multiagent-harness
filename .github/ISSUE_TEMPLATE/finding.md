---
name: Finding
about: A finding that is not fixed in the PR in progress or that needs a separate PR (one per issue).
title: "<Area>: <what happens, in one sentence>"
labels: []
assignees: []
---

<!-- One finding per issue. Never secrets, keys or personal data (emails, ID numbers, PINs). -->

## Origin

<!-- Where it came from: PR (link), review (pr-reviewer, Codex on GitHub, a person), plan (link) or a test incident. If there are other issues from the same incident, link them here. -->

## What happens

<!-- The problem and how it is reproduced or observed. Concrete evidence: error code, log, screenshot. -->

## Where

<!-- Files with `file:line`. -->

## Proposal

<!-- What to change and how to check it is done (test, script or manual step). -->

## Area and severity

- **Area:** <!-- apps/web, apps/mobile, backend, packages/ui, shared, docs, harness -->
- **Severity:** <!-- P0 (security, money, leak, lost data), P1 (must be fixed soon), P2 (improvement) -->
