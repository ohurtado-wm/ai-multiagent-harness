---
name: verify-ui
description: Verifies a running UI and leaves evidence: starts the web app (or the mobile app's flow), takes screenshots in light mode (dark only if the change touches colors, tokens or themes) and checks them against the plan. Use it when someone says "verify the screen", "check how it looks", "take screenshots", or when closing a UI change.
---

# Verify the UI

A UI change is not verified until you see it running. Here the evidence is **screenshots and texts read from the screen**, not assumptions.

## Web

1. Servers in `.claude/launch.json`: `web` (3000) and `web-verify` (3001, a second instance so verification does not collide with the developer's own server). If the app needs a local backend or an `.env.local`, follow `apps/web/README.md`; do not read or edit `.env.local`, ask the person for it.
2. **In the desktop app:** `preview_start` with the name; then `read_page`/`get_page_text` for text and structure, `read_console_messages` and `read_network_requests` for errors, `computer` to interact and `resize_window` (mobile and tablet widths if the plan asks; dark `colorScheme` only if the change touches colors, tokens or themes).
3. **Outside the desktop app:** use the `webapp-testing` skill (Playwright) with the same server.
4. Walk through the plan's flow, capture in **light mode** and check console and network for errors.

## Mobile

Run the app's UI-test flow in a simulator/emulator **of your own** (never the one the person is using) and save one screenshot per screen in `.screenshots/` (ignored by git). A full UI-test suite is a regression test: ask first (rule in `AGENTS.md`); a single class (`ONLY=<TestClass>`) is focused and can run on its own.

**Light mode by default.** Functional rules are tested once, in light mode; repeating the run in dark mode adds nothing if the change does not touch appearance. Also run dark mode only when the change touches colors, design tokens or themes, or when the plan asks for it. If something in the environment is missing, **say so**; do not consider it verified.

## Report

For each screen: what was seen (quote the text read), light/dark screenshot, console/network clean or with errors, and the difference from the plan. End with **what could not be verified** (physical device, printer, remote environment).
