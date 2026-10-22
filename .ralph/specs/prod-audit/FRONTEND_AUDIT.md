# Frontend prod-audit handback

**Owner:** frontend-lead  
**Status:** slice complete · `bun run gate` GREEN  
**Dev:** http://127.0.0.1:8081/

## Public smoke (interactive browser)
| Route | Result |
|-------|--------|
| `/` `/el` | H1 OK; skip link yes |
| `/books` + detail | OK after prior Outlet fix |
| `/blog` + filters | Cards OK |
| `/gallery` | 6 images, not empty |
| `/shop` | product + internal link, no `#` |
| `/contact` | form present |
| `/about` `/masterclasses` `/start` | H1 OK |
| `/admin` | redirects `/auth` |

## Fixed this slice
1. **`resolveMediaUrl`** (`src/lib/media.ts`) — maps CMS leftover `/src/assets/…` basenames to Vite-bundled URLs (prod-safe). Wired on home, about, blog index/detail, books catalog covers.
2. **Blog/home letter covers** — no longer stuck on broken unbundled paths; fallbacks per index.
3. **Shop** — filter chips + card links **focus-visible** gold rings.
4. **Blog** — filter chips + featured card focus rings.
5. **LocaleSwitcher** — focus-visible.
6. **Books catalog** — buy cluster never empty (free guide fallback); LocaleLink for detail; noreferrer on external.
7. **Public copies** of blog/book-desk assets under `/public` for absolute fallbacks.

## Lovable residue (FE)
- **None in `src/`** (grep clean). `AGENTS.md` already standalone. Package deps have no `@lovable/*`. Residual: lockfile registry host → @it-orchestrator.

## Admin
- No credentials → cannot CRUD E2E. Auth gate redirect verified. UI shell previously polished (P1).

## Still not full prod (honest)
- Domain / absolute OG / robots Sitemap absolute
- Admin login E2E with real user
- Book Amazon URLs empty (fallback CTA intentional)
- Heavy images P3
- Privacy page if list grows
- Email delivery beyond DB insert
- CI workflow

## Feature suggestions (FE-adjacent)
1. Privacy + cookie notice pages  
2. Book purchase URLs filled in CMS  
3. Blog cover upload discipline (always Storage, never `/src/assets`)  
4. Related posts on blog detail  
5. Skeleton loaders on CMS grids  
6. Sentry on `reportClientError`  
7. Prefer-reduced-motion audit on remaining Framer pages (about)

## Verify
```bash
cd …/Anastasia-Heartfelt-Journey && bun run gate
# manual: / /blog /books /about — images load; Tab focus rings on shop filters
```
