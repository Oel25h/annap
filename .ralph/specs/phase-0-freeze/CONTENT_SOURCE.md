# Phase 0 — Content source of truth

**CMS-of-record:** Supabase project (see local `.env` / Netlify — do not copy keys here).  
**Static fallback:** `src/data/site.ts`  
**i18n overlays:** `content_translations` (+ UI catalog in `src/lib/i18n`)  
**Media:** Supabase storage bucket `media` (`src/lib/media.ts`)

---

## Principle

| Layer                                                          | Role                                                                                      |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Supabase rows with `status = published` (where applicable)** | Production content editors change in admin                                                |
| **`content_translations` (approved)**                          | Greek (and future locales) copy overlays per entity                                       |
| **`src/data/site.ts`**                                         | Seed / empty-CMS fallback for home books/posts/gallery-shaped UI — **not** a parallel CMS |
| **Route copy / components**                                    | Structure and chrome; prefer CMS blocks over hardcoding marketing prose long-term         |

**Drift risk:** Home (`src/routes/index.tsx`) still imports `BOOKS` / `POSTS` from `site.ts` and merges/falls back when Supabase returns empty or partial fields. Phase 1+ should treat empty CMS as designed empty states, not silent static republish of stale seed — unless explicitly seeding.

---

## Supabase entities (migrations)

| Table                                                             | Public use                          | Admin                                        | Notes                                                  |
| ----------------------------------------------------------------- | ----------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `books`                                                           | List/detail, sitemap                | CRUD (create/update/delete + seed landed P1) | Reviews via `book_reviews`; status = published\|hidden |
| `book_reviews`                                                    | Book pages                          | Via books admin                              |                                                        |
| `blog_posts`                                                      | Blog list/detail, sitemap           | Admin blog                                   |                                                        |
| `blog_categories`                                                 | Blog filters                        | Admin                                        |                                                        |
| `gallery_sections` / `gallery_images`                             | Gallery                             | Admin gallery                                |                                                        |
| `products` / `product_categories` / `product_images`              | Shop                                | Admin products                               | Payments deferred                                      |
| `masterclass`                                                     | Masterclasses                       | Admin                                        |                                                        |
| `page_content`                                                    | Home/about blocks (`getPageBlocks`) | Admin pages                                  | `block_key` + JSON value `{ v }`                       |
| `start_page_settings` / `start_page_links` / `start_page_socials` | `/start` + site socials             | Admin Start/Socials                          |                                                        |
| `contact_messages`                                                | Contact form insert (server)        | Admin messages                               |                                                        |
| `subscribers`                                                     | Newsletter (server)                 | Admin newsletter                             |                                                        |
| `newsletters`                                                     | Campaign-ish records                | Admin                                        |                                                        |
| `user_roles`                                                      | Admin ACL                           | Setup via `ADMIN_SETUP_SECRET`               |                                                        |
| `content_translations`                                            | EL overlays                         | Gemini draft + approve path                  | `translate.functions.ts`                               |

Server entry points: `books.functions.ts`, `public.functions.ts`, `admin.functions.ts`, `translate.functions.ts`.

---

## Static `src/data/site.ts`

| Export              | Used for                                                        |
| ------------------- | --------------------------------------------------------------- |
| `BOOKS`             | Fallback book cards/copy (e.g. home); seed shape for FYRTS etc. |
| `POSTS`             | Fallback blog teasers on home                                   |
| `CATEGORIES`        | Blog category labels (static const)                             |
| `GALLERY`           | Fallback gallery chapters/images (local asset imports)          |
| (remainder of file) | Other marketing constants if present                            |

Local heavy assets under `src/assets/` (book desk, covers, gallery) — P3 compression/CDN; not CMS.

---

## EN / EL routing contract

| Concern   | Rule                                                                           |
| --------- | ------------------------------------------------------------------------------ |
| Routes    | EN file routes + thin `el.*` twins re-exporting page components + local `head` |
| Paths     | `localizePath` / `/el/...` prefix                                              |
| CMS body  | EN in primary tables; EL via approved `content_translations`                   |
| UI chrome | `LocaleProvider` / `useT()` catalogs                                           |
| SEO       | Per-route titles; hreflang/canonical discipline on public changes (P4 harden)  |
| Sitemap   | Both locales for static paths + published posts/books                          |

Any **new public page** must ship EN + `el.*` twin in the same slice.

---

## What is NOT source of truth

- `dist/` / `.output` / `.netlify` build artifacts
- Lovable preview URLs as canonical `SITE_URL`
- Hardcoded `localhost:8080` in `robots.txt` (bug until prod domain)
- Relative `/og.jpg` for social crawlers (needs absolute)

---

## Phase 1 content implications

1. Books admin: create/delete + seed from agreed seed (static or SQL) into `books`
2. Public books/home: prefer published CMS; designed empty if none — avoid dual-edit of `site.ts` for live copy
3. Translate path: keep Gemini + approve; no auto-publish unapproved EL
4. Document seed procedure in admin or `.ralph/specs` when fullstack lands glue
