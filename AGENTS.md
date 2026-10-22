# Agent notes

Standalone TanStack Start + Supabase app, hosted on **Cloudflare Workers** (Nitro `cloudflare-module` preset, config in `wrangler.jsonc`). The plan and every rule for the redo live in `docs/redo-brief.md`; read it first.

- Ship: `bun run gate` (typecheck → lint → unit tests → db:check → build:cf → secrets:check → Playwright). Needs the local Supabase stack running.
- Local database: `npx supabase start` (then `npx supabase db reset` to rebuild from `supabase/migrations/`). Point `.env` at it. Do not put `SUPABASE_PROJECT_ID` in `.env`: the Supabase CLI reads it and starts a second stack.
- After a migration: `bun run db:types`, then `bun run db:check` (policy assertions and publishing tests in `supabase/tests/`).
- Run the production build on Cloudflare's runtime: `bun run build:cf && bun run preview:cf`.
- Deploy: `bun run deploy` (gate, then `wrangler deploy`). Deploys only come from a green gate.
- Public settings (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SITE_URL`) are read at runtime; never read `import.meta.env.VITE_*` in app code (the secrets check fails the gate).
- Secrets stay server-only: `SUPABASE_SERVICE_ROLE_KEY`, `APP_ENCRYPTION_KEY`, `ADMIN_SETUP_SECRET`. On Cloudflare set them with `wrangler secret put` or the dashboard, never in `wrangler.jsonc`. Third-party keys are entered in the studio.
- Migrations are additive and idempotent; never drop or rename a table or column that has data without Joel's go-ahead. Redo migrations are applied to production only at cutover.
- Never mark Greek as approved from code, seeds or scripts; a person approves it in the studio.
- Public pages get data only from server functions in `src/lib/content.functions.ts` (no supabase-js, Zod or sanitize-html in the browser; `bun run bundle:check` enforces it). Studio server functions use `requireAdmin` or `requireTranslator` from `src/lib/studio-auth.ts`, never a global middleware.
- Server-only modules end in `.server.ts` and are loaded with `await import()` inside handlers. Do not also dynamically import a module that is statically imported elsewhere in the server graph: the bundler can split it into a chunk cycle and the worker fails at start with `__exportAll is not a function`.
- No autonomous loops. Do not force-push shared history once a remote is connected.
