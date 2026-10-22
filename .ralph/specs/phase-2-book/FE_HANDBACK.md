# Phase 2.2 — Book detail FE handback

**Owner:** frontend-lead  
**Status:** implemented · awaiting @design-lead accept  
**Gate:** `bun run gate` (run at handoff)

## Spec

`.ralph/specs/phase-2-book/BOOK_DETAIL_SPEC.md`

## Shipped

- Cover **stage** + `object-contain` (parity with home featured)
- **Buy cluster never empty**: Amazon → eBook → fallback **Get the free guide** `/start` + always See all books
- External links `rel="noopener noreferrer"` + external icon
- Gold **focus-visible** on back, buys, about, sticky
- `rounded-3xl` cards/stage/author
- Stars `aria-hidden`; reviews display (not italic); hide section until loaded / if empty
- Quote overlay `bg-plum/50`
- **Sticky buy bar** after hero cluster scrolls off (bottom mobile, under header desktop)
- LocaleLink for internal paths (EL twin OK)

## Paths

- `src/routes/books.find-your-reason-to-smile.tsx` (EL re-export unchanged)

## Residual

- OG image still bundler path (orch/SITE_URL)
- Buy label i18n still EN short-term
- **Route fix included:** `/books` parent lacked `<Outlet />`, so detail never mounted. Split to blog pattern: `books.tsx` + `books.index.tsx`, same for `el.books*`
