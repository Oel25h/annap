# Production audit — findings (IT Orchestrator + team)

**Date:** 2026-08-24  
**Dev:** http://localhost:8080/  
**Scope:** full public EN/EL HTTP smoke + Lovable strip + gate

## Lovable removal (DONE — @it-orchestrator)

| Item                                          | Status                                                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `@lovable.dev/vite-tanstack-config`           | removed; vanilla `vite.config.ts` (TanStack Start + Nitro + Tailwind)                          |
| `@lovable.dev/mcp-js` + `src/lib/mcp/`        | removed                                                                                        |
| `lovable-error-reporting` → `error-reporting` | done                                                                                           |
| Supabase “Lovable Cloud” error copy           | cleaned                                                                                        |
| `.lovable/` directory                         | removed                                                                                        |
| `package.json`                                | no `@lovable.dev/*`                                                                            |
| `AGENTS.md` Lovable block                     | **blocked** by Hermes protected-file guard — **@user** please clear/replace AGENTS.md manually |
| Spec docs mentioning Lovable history          | historical only under `.ralph/specs/`                                                          |

**Verify:** `bun run typecheck` · `bun run build:netlify` · `bun run secrets:check` — all green after strip.

## Ralph

- `ralph.yml` refreshed for prod-audit task (Hermes custom backend)
- `PROMPT.md` = full audit+fix loop
- `ralph doctor -c ralph.yml` → **PASS**

## HTTP smoke (dev, curl)

| Path                                                                    | Code | Notes                                                             |
| ----------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- |
| `/` … main EN pages                                                     | 200  | titles OK                                                         |
| `/books`, FYRTS detail                                                  | 200  |                                                                   |
| `/blog` `/gallery` `/masterclasses` `/shop` `/start` `/contact` `/auth` | 200  |                                                                   |
| `/admin`                                                                | 200  | client shell (ssr:false) — tiny HTML OK; needs logged-in UI smoke |
| `/el` `/el/about` `/el/books` `/el/blog`                                | 200  | titles OK                                                         |
| `/el/gallery` `/el/masterclasses` `/el/shop` `/el/start` `/el/contact`  | 200  | **were missing `head` titles** → **fixed** this pass              |
| `/unsubscribe`                                                          | 307  | route exists; needs `?token=` for full flow                       |
| `/sitemap.xml`                                                          | 200  |                                                                   |
| `/robots.txt`                                                           | 200  | no longer hardcodes localhost sitemap                             |
| unknown path                                                            | 404  | OK                                                                |

## Remaining production blockers

1. **@user** — prod domain for absolute `SITE_URL` / robots Sitemap / OG (OG now uses `absoluteUrl()` but still localhost without env)
2. **Git** — still no `.git` (blocks Ralph worktrees/merge queue)
3. **Admin deep audit** — needs credentials: books/blog/gallery/products/pages CRUD, newsletter send, image upload, Greek translate, messages
4. **Forms** — contact + email capture + unsubscribe end-to-end with Supabase
5. **P2 beauty** — continue design accept → book detail etc. (not blocking “works”)
6. **P3** — image weight / CDN
7. **CI** — no GitHub Actions yet (`gate` local only)
8. **AGENTS.md** — still has Lovable banner until user allows rewrite

## Feature suggestions (prioritized)

See `SUGGESTIONS.md`.

## Ownership next

| Who                  | Next                                                                        |
| -------------------- | --------------------------------------------------------------------------- |
| **@fullstack**       | contact/newsletter/unsubscribe E2E + admin ACL spot-check; CMS empty states |
| **@frontend-lead**   | interactive admin UI smoke + remaining P2 pages; EL head parity watch       |
| **@design-lead**     | P2 screenshot accepts                                                       |
| **@perf-guardian**   | re-run full `bun run gate` after this strip; CI workflow optional           |
| **@it-orchestrator** | git init when remote known; Netlify env when domain known; keep Lovable out |
| **@tech-lead**       | sequence admin auth smoke + form E2E before calling “prod ready”            |
