# AGENTS.md — apps/web

Web application of the project. General rules in the root [`AGENTS.md`](../../AGENTS.md).

- **Validate:** `scripts/verify.sh web` (tokens, and the `typecheck`, `lint`, `test` and `build` scripts of `package.json` when they exist). Development server: `.claude/launch.json` (`web`, port 3000).
- Shared components live in `packages/ui`; the design tokens, in `shared/design/tokens.json` (`packages/ui/src/tokens.css` is generated with `npm run tokens`; a hook prevents editing it by hand).
- **Session and secrets:** only public keys in the client; the session in `httpOnly` cookies; never server/service keys. Do not read or edit `.env.local`: ask the person for it.
- Lists and tables follow the «Lists and tables» rule in [`ARCHITECTURE.md`](../../docs/architecture/ARCHITECTURE.md).

## Code Review Rules

They add to the root ones. Mark as severe (P0/P1):

- **A server/service key** or any secret in the code; only public keys and the person's session.
- **Session outside `httpOnly` cookies**, or private pages without checking the session on the server.
- **Lists that filter, sort or truncate on screen** instead of in the backend.
- **Example or invented data** served as if it were the real data of the account.
