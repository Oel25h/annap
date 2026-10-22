# Slice A — IT Orchestrator

## Done
- Regenerated `bun.lock` via public registry install — **0** `lovable-core-prod` / Lovable npm cache URLs (backup: `bun.lock.lovable-backup.*`)
- `netlify.toml` build command → `bun run build:netlify` (NITRO_PRESET already set)
- Local `git init -b main` (no remote yet — attach Lovable/GitHub remote when user provides URL)
- `bun run gate` GREEN after lockfile + prettier types fix

## Waiting on @user
- Production domain → set `SITE_URL` + `VITE_SITE_URL` in Netlify + local `.env`, absolute robots Sitemap
- Git remote URL if they want push
- Confirm Netlify site `cc330473-a548-46be-a5c7-468b9080acfd` is the prod site

## Not done
- Netlify env vars push (needs domain + CLI auth if not linked interactively)
- Image CDN (P3 with @perf-guardian)
