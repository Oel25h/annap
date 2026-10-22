# Agent notes

Standalone TanStack Start + Supabase app, hosted on **Cloudflare Workers** (Nitro `cloudflare-module` preset, config in `wrangler.jsonc`).

- Ship: `bun run gate` (typecheck → lint → build:cf → secrets:check)
- Run the production build locally on Cloudflare's runtime: `bun run build:cf && bun run preview:cf` (reads `.output/server/.dev.vars`)
- Deploy: `bun run deploy` (gate, then `wrangler deploy`)
- Local database: `npx supabase start` applies `supabase/migrations/`; point `.env` at it for development
- Secrets stay server-only: `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SETUP_SECRET`, `GEMINI_API_KEY`. On Cloudflare set them with `wrangler secret put` or the dashboard, never in `wrangler.jsonc`
- Set `SITE_URL` / `VITE_SITE_URL` to the production HTTPS origin
- Do not force-push shared git history once a remote is connected
