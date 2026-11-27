# AGENTS.md — apps/mobile

Mobile application of the project. General rules in the root [`AGENTS.md`](../../AGENTS.md).

- **Validate:** `scripts/verify.sh mobile`. For a native app, replace `area_mobile` in `scripts/verify.sh` with the real commands (`xcodebuild … test`, `./gradlew testDebugUnitTest`). CI does not build native apps: they are validated locally.
- **Simulators:** agents use their own simulator/emulator, never the one the person is using. A full UI-test suite is a regression test (ask first); a single class with `ONLY=<TestClass>` is focused.
- **Parity:** if the project declares a functional reference, screens are ported from it (same texts, order and rules); differences go in the plan.
- **Persisted data:** a model change must not lose data stored by a previous version of the app; include a migration and a test.

## Code Review Rules

They add to the root ones. Mark as severe (P0/P1):

- **A persisted model change without a migration** (data from the previous version is lost or the app crashes on update).
- **Secrets or server keys** in the app bundle.
- **Business rules recomputed differently** from the backend or the reference, without the difference declared in the plan.
