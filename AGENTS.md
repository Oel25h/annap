# Agent notes

Standalone TanStack Start + Supabase app, hosted on **Netlify** (Nitro `netlify` preset: one Node server function plus static files in `dist`; config in `netlify.toml`). The plan and every rule for the redo live in `docs/redo-brief.md`; read it first.

- Ship: `bun run gate` (typecheck → lint → unit tests → db:check → build → secrets:check → bundle:check → Playwright against the Netlify build). Needs the local Supabase stack running.
- Local database: `npx supabase start` (then `npx supabase db reset` to rebuild from `supabase/migrations/`). Point `.env` at it. Do not put `SUPABASE_PROJECT_ID` in `.env`: the Supabase CLI reads it and starts a second stack.
- After a migration: `bun run db:types`, then `bun run db:check` (policy assertions and publishing tests in `supabase/tests/`).
- Run the production build locally: `bun run build && bun run serve` (http://127.0.0.1:8888). `scripts/serve-netlify.mjs` serves `dist` with the `netlify.toml` headers and sends everything else to the server function, as Netlify does, and works offline (`netlify serve` needs api.netlify.com).
- Scheduled work: Netlify Scheduled Functions in `netlify/functions/` (outbox drain every 5 minutes, `purge_expired` daily at 03:17 UTC, YouTube sync hourly), each calling `src/server/tasks/scheduled.server.ts`. The schedule is the function's `config` export.
- Client IP for rate limits: `x-nf-client-connection-ip` (set by Netlify's edge), then `x-forwarded-for`.
- Deploy: manual, from the owner's machine, with the Netlify CLI (the site is not Git-linked). Put `NETLIFY_AUTH_TOKEN` (a personal access token) and `NETLIFY_SITE_ID` (Site configuration > Site ID) in the environment or `.env`, then `bun run deploy:netlify`: it runs the gate (which builds), then `netlify deploy --prod --no-build`, uploading `dist`, the server function in `.netlify/functions-internal` and `netlify/functions`. Deploys only come from a green gate.
- Netlify site settings: environment variables as listed in `.env.example` (scope Functions; server-only ones marked secret). Node 22 comes from `netlify.toml`. Security headers and the per-route Content-Security-Policy are set by the server (`src/start.ts`); static files get the static set from `netlify.toml`.
- Public settings (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SITE_URL`) are read at runtime; never read `import.meta.env.VITE_*` in app code (the secrets check fails the gate).
- Secrets stay server-only: `SUPABASE_SERVICE_ROLE_KEY`, `APP_ENCRYPTION_KEY`, `ADMIN_SETUP_SECRET`. On Netlify set them in the site's environment variables, never in `netlify.toml`. Third-party keys are entered in the studio.
- Migrations are additive and idempotent; never drop or rename a table or column that has data without Joel's go-ahead. Redo migrations are applied to production only at cutover.
- Never mark Greek as approved from code, seeds or scripts; a person approves it in the studio.
- Public pages get data only from server functions in `src/lib/content.functions.ts` (no supabase-js, Zod or sanitize-html in the browser; `bun run bundle:check` enforces it). Studio server functions use `requireAdmin` or `requireTranslator` from `src/lib/studio-auth.ts`, never a global middleware.
- Server-only modules end in `.server.ts` and are loaded with `await import()` inside handlers. Do not also dynamically import a module that is statically imported elsewhere in the server graph: the bundler can split it into a chunk cycle and the server fails at start with `__exportAll is not a function`.
- No autonomous loops. Do not force-push shared history once a remote is connected.
