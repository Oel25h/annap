# Agent notes

Standalone TanStack Start + Supabase + **Vercel** app (Nitro `vercel` preset).

- Ship: `bun run gate` (typecheck → lint → build:vercel → secrets:check)
- Deploy: `bun run deploy` or `vercel deploy --prod`
- Secrets stay server-only: `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SETUP_SECRET`, `GEMINI_API_KEY`
- Do not force-push shared git history once a remote is connected
- Set `SITE_URL` / `VITE_SITE_URL` to the production HTTPS origin on Vercel
