# Phase 0 — Ship checklist (freeze truth)

**Project:** Anastasia Heartfelt Journey  
**Path:** `/Users/oel25h/Documents/Anastasia-Heartfelt-Journey`  
**Roadmap:** A (prod-ready + advanced editorial)  
**Owners:** @tech-lead (accept) · @it-orchestrator (env/deploy)  
**Status:** Frozen 2026-08-23 — awaiting prod domain from @user  
**Lovable:** Connected — **never** force-push, rebase, amend, or squash published history

---

## 1. Domain / SITE_URL

| Item                                         | Value                                                                                                                      |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Prod domain**                              | **TODO @user** — not set                                                                                                   |
| `SITE_URL` / `VITE_SITE_URL` (local default) | `http://localhost:8080` (`.env.example`)                                                                                   |
| Runtime helper                               | `src/lib/site-url.ts` → `siteUrl()` / `absoluteUrl()`                                                                      |
| Sitemap route                                | `/sitemap.xml` uses `siteUrl()` + CMS slugs (EN + `/el`… )                                                                 |
| **robots.txt**                               | `public/robots.txt` still has `Sitemap: http://localhost:8080/sitemap.xml` — **must** match prod `SITE_URL` before launch  |
| **OG/Twitter image**                         | `__root.tsx` uses relative `/og.jpg` — scrapers need **absolute** URL via `absoluteUrl('/og.jpg')` once `SITE_URL` is real |
| `public/og.jpg`                              | Present                                                                                                                    |

**Rule:** Do not invent a production domain. When @user provides it (e.g. `https://example.com`), set Netlify + local env and fix robots + root OG in the same ship slice.

---

## 2. Netlify / Nitro

| Item             | Value                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Netlify site id  | `cc330473-a548-46be-a5c7-468b9080acfd` (`.netlify/state.json`)                                     |
| Build            | `bun run build` → publish `dist`                                                                   |
| `NITRO_PRESET`   | **`netlify`** only on ship (`netlify.toml` `[build.environment]`)                                  |
| Functions        | `.netlify/functions-internal`, `node_bundler = none`                                               |
| Node             | `22`                                                                                               |
| Dual-target risk | Lovable/Cloudflare leftovers (`.wrangler`) — **do not** switch default deploy off Netlify casually |

**Ship command pattern (ops):** verify → build with Nitro netlify → deploy prod from `dist` / Netlify pipeline — no secrets in client bundles (@perf-guardian gate).

---

## 3. Env matrix (from `.env.example`)

### Client-safe (publishable / public origin)

| Var                                                          | Purpose                                   |
| ------------------------------------------------------------ | ----------------------------------------- |
| `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PROJECT_ID`           | Project id                                |
| `SUPABASE_URL` / `VITE_SUPABASE_URL`                         | API URL                                   |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/publishable key                      |
| `SITE_URL` / `VITE_SITE_URL`                                 | Canonical origin (sitemap, absolute URLs) |

Mirror `VITE_*` for anything the browser must read. Keep values identical pairs in Netlify UI.

### Server-only (never `VITE_`, never client chunks)

| Var                         | Purpose                               |
| --------------------------- | ------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin server fns / elevated writes    |
| `ADMIN_SETUP_SECRET`        | Admin bootstrap                       |
| `GEMINI_API_KEY`            | Greek draft translate (admin)         |
| `GEMINI_TRANSLATE_MODEL`    | Optional (default `gemini-2.0-flash`) |

`.env` is gitignored. **Every release:** secrets-not-in-client verify on build output (P1 @perf-guardian).

**Do not commit or paste real keys into specs, PRs, or chat.**

---

## 4. Content truth (summary)

Full detail: `CONTENT_SOURCE.md`.

- **CMS-of-record:** Supabase tables + `content_translations` + storage `media`
- **Static fallback / seed-shaped copy:** `src/data/site.ts` (`BOOKS`, `POSTS`, `GALLERY`, …) still imported on home and elsewhere when CMS empty
- **Risk:** dual content drift — Phase 1 prefers CMS published rows; static is fallback only, not a second editorial surface

---

## 5. Git / Lovable

| Item            | State                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Local `.git`    | **Missing** (`NO_GIT` on disk)                                                                                                           |
| Lovable linkage | `AGENTS.md` Lovable block + `.lovable/` present                                                                                          |
| Recommendation  | @it-orchestrator: `git init` **or** clone/reconnect Lovable remote **without** rewriting published history; then normal commits/PRs only |
| Ralph           | Worktrees/merge queue need git — blocked until init/clone                                                                                |

---

## 6. Quality gates (current vs target)

| Gate                                | Now    | Target (P1+)             |
| ----------------------------------- | ------ | ------------------------ |
| `dev` / `build` / `lint` / `format` | Yes    | Keep                     |
| `typecheck`                         | **No** | Add                      |
| Tests / CI workflows                | **No** | Smoke first; e2e later   |
| Secrets-in-client check             | Manual | Scripted on build output |
| Image/CWV budgets                   | **No** | P3                       |

---

## 7. Smoke paths (EN + EL)

Run after each deploy and before calling a phase done:

| Path          | EN                                 | EL                                    |
| ------------- | ---------------------------------- | ------------------------------------- |
| Home          | `/`                                | `/el` or `/el/`                       |
| Books index   | `/books`                           | `/el/books`                           |
| Flagship book | `/books/find-your-reason-to-smile` | `/el/books/find-your-reason-to-smile` |
| Blog index    | `/blog`                            | `/el/blog`                            |
| Contact       | `/contact`                         | `/el/contact`                         |
| Start         | `/start`                           | `/el/start`                           |
| Sitemap       | `/sitemap.xml`                     | (includes both locales)               |
| Admin login   | `/auth` → `/admin`                 | n/a (studio)                          |

Also: newsletter subscribe, contact submit, unsubscribe (`/unsubscribe`), admin books list once CRUD lands.

---

## 8. Phase exit criteria (Phase 0)

- [x] This checklist written
- [x] `CONTENT_SOURCE.md` written
- [x] robots localhost + relative OG documented (no fake domain)
- [x] Git gap documented
- [ ] **@user:** prod domain URL
- [ ] **@it-orchestrator:** git init/clone + Netlify env matrix when domain known
- [ ] Phase 1 unblocked for books/CMS glue + gates + admin UI + design freeze

---

## 9. Immediate next (Phase 1 sequence)

1. @fullstack — books create/delete + seed + ACL mirror; CMS empty-never-blank; EN/EL contract
2. @frontend-lead — admin books UI + quiet chrome
3. @design-lead — token/name freeze + button/focus + public north-star (no random restyle)
4. @perf-guardian — typecheck + lint/build fail-fast + smoke + secrets-not-in-client
5. @it-orchestrator — env/robots/OG absolutes when domain set; Nitro=netlify only; git restore

**Guardrails:** no public redesign until P2 specs; no Codex; no secrets in repo.
