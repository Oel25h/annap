# Prod audit — Perf / quality / DevOps (@perf-guardian)

**Date:** 2026-08-24  
**Dev:** http://127.0.0.1:8081/  
**Status:** Gate GREEN · public HTTP smoke GREEN · **not full prod-complete** (domain, admin login E2E, media budgets, lockfile registry)

---

## Gate (automated)

| Check                   | Result                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `bun run typecheck`     | PASS                                                                                |
| `bun run lint`          | PASS (11 react-refresh warnings)                                                    |
| `bun run build:netlify` | PASS                                                                                |
| `bun run secrets:check` | PASS — 73 files in `dist/`; env values for service role + admin setup not in client |
| `bun run gate`          | **GREEN**                                                                           |

Reproduce: `cd …/Anastasia-Heartfelt-Journey && bun run gate`

---

## HTTP smoke (dev :8081)

All listed paths returned **200** (except `/unsubscribe` → **307** expected redirect shape):

| Path                                                            | Code | Notes                                      |
| --------------------------------------------------------------- | ---- | ------------------------------------------ |
| `/` `/about`                                                    | 200  | Titles present                             |
| `/books` + FYRTS detail                                         | 200  |                                            |
| `/blog` `/gallery` `/shop` `/contact` `/masterclasses` `/start` | 200  | `/start` small HTML shell OK               |
| `/el` + books/gallery/shop/contact/start                        | 200  | Greek home title OK                        |
| `/auth` `/admin`                                                | 200  | Admin client shell (auth gate client-side) |
| `/sitemap.xml` `/robots.txt` `/favicon.ico`                     | 200  |                                            |

---

## Lovable removal (this slice)

| Item                                                        | Status                                                                                                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` `@lovable/*`                                 | Already gone                                                                                                                        |
| `vite.config.ts`                                            | Vanilla TanStack/Nitro (comment cleaned)                                                                                            |
| `bunfig.toml`                                               | Clean                                                                                                                               |
| `.lovable/`                                                 | Absent                                                                                                                              |
| `AGENTS.md` Lovable banner                                  | **Replaced** with standalone agent notes                                                                                            |
| `src` UI strings                                            | No Lovable branding                                                                                                                 |
| `bun.lock` tarball hosts `lovable-core-prod` npm cache URLs | **Residual** — cosmetic/supply-chain; full `bun install` from registry.npmjs.org will rewrite (coord @it-orchestrator; large churn) |

---

## Perf findings (ship blockers vs P3)

| Finding                                                                          | Severity                             | Owner                      |
| -------------------------------------------------------------------------------- | ------------------------------------ | -------------------------- |
| Hero/book art still multi‑MB (`fyrts-author` ~1.8MB, cover ~1.5MB, quote ~1.0MB) | **P3** but hurts LCP                 | perf + FE + media pipeline |
| `index-*.js` ~592KB · `RichEditor` ~425KB (admin-split OK if never on public)    | Watch                                | FE on imports              |
| `admin.subscribers` ~345KB chunk                                                 | OK admin-only                        | —                          |
| No CWV budgets / Lighthouse CI                                                   | P3–P4                                | perf                       |
| No GitHub Actions for `gate`                                                     | P4                                   | perf + orchestrator        |
| Prod domain / absolute OG still open                                             | **Ship block**                       | user + orchestrator        |
| `robots.txt` Sitemap relative `/sitemap.xml`                                     | OK interim; absolute when domain set | orchestrator               |

---

## Fixed this slice

1. Gate was **RED** (prettier on `shop.tsx`) → autofix → **GREEN**
2. Dev was down → restarted on **:8081**
3. `AGENTS.md` Lovable block removed
4. Full public EN/EL + auth/admin/sitemap/robots curl matrix documented

---

## Not verified here (needs others / you)

- Admin CRUD E2E (login credentials) — @frontend-lead / @user
- Email delivery (DB-only forms) — @fullstack / orchestrator
- Git remote + history policy — @it-orchestrator
- Book Amazon/ebook URLs in CMS — content
- Privacy/cookie page if list is live — product

---

## Feature suggestions (quality/ops lens)

1. **CI:** GitHub Action = `bun run gate` on PR
2. **Sentry** (or similar) wired to `error-reporting.ts`
3. **Image pipeline:** WebP/AVIF + width caps; fail gate if asset > 400KB on public path
4. **Uptime + synthetic smoke** post-deploy (paths in `SMOKE.md`)
5. **Preview deploys** with `SITE_URL` = deploy URL for OG testing
6. **Rate-limit** contact/newsletter at edge
7. **Lighthouse CI** budgets: LCP < 2.5s mobile on home/book

---

## Ship/no-ship

**No-ship to public prod** until: domain + absolute OG/robots, admin login smoke, lockfile/registry cleanup optional, and image P3 for “feels expensive.”

**Yes for continued staging/dev:** gate green, routes up, secrets clean, Lovable app surface cleared.
