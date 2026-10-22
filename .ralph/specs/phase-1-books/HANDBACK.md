# Phase 1 — Books glue + EN/EL content contract

**Owner:** fullstack  
**Status:** landed (code + live seed)  
**Handback:** frontend-lead owns remaining admin polish only if needed; public beauty = P2

## What was already true

- `createBook` / `deleteBook` / `updateBook` with `has_role` admin ACL
- Admin books UI: Add / Delete / EmptyState / GreekTranslationPanel
- Public `/books` + thin `/el/books`; detail FYRTS route + EL twin
- EL overlays via approved `content_translations` only

## What we fixed / added

1. **Status contract bug** — DB CHECK is `published | hidden`. Admin + `createBook` used `draft` (blog/translations value) which **fails inserts**. Now:
   - create → `hidden`
   - admin select → published / hidden
   - updateBook maps legacy `draft` → `hidden`
2. **Seed** — migration `supabase/migrations/20260823120000_seed_books.sql` + applied to live project:
   - `find-your-reason-to-smile` + `turning-pain-into-purpose` (published)
   - reviews from static `site.ts` (idempotent)
   - covers at `/public/fyrts-cover.png`, `/public/book-turning-pain.jpg`
3. **EN hreflang** — `/books` and FYRTS detail now ship alternate en/el/x-default (EL twins already had them)
4. **CMS empty** — `/books` already has designed empty (“New books coming soon”); home still uses `site.ts` as **loading/empty fallback** until CMS row exists (now seeded, so CMS wins)

## EN / EL content contract (locked)

| Layer                       | Rule                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------ |
| Primary tables (`books`, …) | English source of truth                                                              |
| `content_translations`      | EL (and future) overlays; **approved only** on public                                |
| UI chrome                   | `useT()` catalogs — not CMS                                                          |
| Routes                      | Every public EN route needs thin `el.*` twin + head                                  |
| SEO                         | canonical + hreflang en/el/x-default on public pages                                 |
| Admin drafts                | Book visibility = `hidden`; translation drafts stay in `content_translations.status` |

## Verify

- [x] Live Supabase: 2 published books + reviews
- [ ] `bun run build` (local)
- [ ] Admin `/admin/books` lists seed; Add creates **hidden** row
- [ ] Public `/books` + `/el/books` show CMS rows
- [ ] Amazon/ebook URLs still null — set in admin when ready

## Residual / not this slice

- Purchase URLs empty until editor fills
- Home `site.ts` fallback remains for zero-CMS; dual-edit discouraged (CONTENT_SOURCE.md)
- Public redesign = Phase 2 design → FE
- Cover assets in `/public` are large — P3 compress/CDN
