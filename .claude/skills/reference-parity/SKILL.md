---
name: reference-parity
description: Compares a screen or rule of a platform with its origin in the project's functional reference app (declared in AGENTS.md) and reports differences in text, order and rules. Use it when someone says "check parity", "does it match the reference?", "compare with the reference app", or before considering a ported screen done.
---

# Parity with the functional reference

When the project has a functional reference (declared in `AGENTS.md`, «Project context»), screens on other platforms are **ported** from it, not redesigned (owner criterion in `AGENTS.md`). This skill only **reads and reports**; it does not edit code. If no reference is declared, say so and stop.

## Steps

1. **Narrow** what is compared: the screen, flow or rule (for example «checkout» or «discounts»). If it is ambiguous, ask which one.
2. **Origin:** delegate to the `reference-explorer` subagent («find the origin of <topic> in the reference app: views, services and exact texts»). If it is not available, search it yourself in the reference path.
3. **Target:** read the equivalent screen on the platform being checked.
4. **Compare** in this order and with `file:line` citations from both sides:
   - **Texts** (titles, buttons, messages, empty states): identical except what the plan declares.
   - **Order and structure** (sections, fields, navigation).
   - **Rules** (calculations, validations, permissions, states); if there is a calculation, redo it by hand with a case from the plan and compare it with the code on both sides.
   - **Deliberate differences:** those the plan already records are not findings; mark them «declared».
5. **Report** a table `Topic | Reference (citation) | Target (citation) | Verdict` with the verdict `same`, `declared` or `differs`, and at the end what you **could not compare** (for example, behavior only visible by running the app).

Do not propose redesigns: if something differs without being declared, the change is either aligning the target with the reference or recording the difference in the plan, and the owner decides.
