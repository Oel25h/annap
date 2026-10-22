# Phase 2.2 — Book detail elevation (FYRTS)

**Route:** `/books/find-your-reason-to-smile` + EL twin  
**File:** `src/routes/books.find-your-reason-to-smile.tsx` (EL re-exports)  
**Owner:** design-lead → **@frontend-lead**  
**Bar:** Stripe Press / cinematic memoir product page  
**Tokens:** `DESIGN.md` only — no new palette

---

## Baseline sections (keep order)

1. Back link + hero (cover | title / pitch / buy)
2. Full-bleed pull quote
3. Inside the book (chapter cards)
4. About the author
5. Reader reviews (CMS)
6. Email capture banded

Do not add random new sections.

---

## Live / code QA (pre-elevation)

| Issue                                                            | Spec                                                                                    |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `amazon_url` / `ebook_url` often **null** → hero has **no CTAs** | Always show a buy cluster (see §Buy)                                                    |
| Cover uses `object-cover` in rounded box — can crop artwork      | Prefer **contain** on stage like home featured                                          |
| Stars on cover badge lack `aria-hidden`                          | Decorative → `aria-hidden`                                                              |
| Focus rings missing on links/buttons                             | Gold `focus-visible` stack (home `focusRing`)                                           |
| Mix of `rounded-[1.75rem]` vs system                             | Normalize **`rounded-3xl`**                                                             |
| Hardcoded EN copy; EL twin thin                                  | Keep EN source; ensure layout survives Greek title length                               |
| `og:image` uses bundler cover path                               | Leave absolute OG to orch/`SITE_URL` (P0 residual) — don’t block P2.2                   |
| No sticky purchase affordance                                    | Optional compact sticky bar after scroll past hero CTAs                                 |
| Reviews italic + display                                         | Prefer `font-display` **not** true italic if face lacks italic — match home quote voice |

---

## 1. Hero

### Layout

- Desktop: cover left (~0.95fr), copy right (~1.05fr), vertically centered.
- Mobile: cover → copy.
- Back: “All books” with ArrowLeft; hover burgundy; focus ring.

### Cover artifact

| Item  | Spec                                                                                                  |
| ----- | ----------------------------------------------------------------------------------------------------- |
| Stage | Ivory→bone soft gradient panel, `rounded-3xl`, `border-plum/10`, `soft-shadow-lg`, padding 24–32px    |
| Image | `object-contain` aspect 3/4; never squash; max width ~360–420px                                       |
| Badge | Floating “Reader rated” + stars under cover OK; `aria-hidden` on stars; don’t collide with sticky bar |
| LCP   | Cover is LCP candidate — no lazy; width/height attrs                                                  |

### Type

- Chip: Memoir (or CMS category later) — burgundy/10 pill.
- H1: display 5xl→7xl; coral accent on one word max (`Smile`).
- Subtitle: coral display accent line OK if not competing with H1 — if heavy, demote subtitle to `text-ink` lg.
- Pitch: max-w-lg, relaxed leading.

### Buy cluster (§Buy) — critical

Always render **one primary + optional secondary + fallback**:

| Priority | Control                                                  | When                                          |
| -------- | -------------------------------------------------------- | --------------------------------------------- |
| 1        | **Buy on Amazon** solid coral                            | `amazon_url` present                          |
| 2        | **Get the eBook** outline                                | `ebook_url` present                           |
| 3        | **Notify me / Get the guide** → `/start` or email anchor | **both URLs null** — never empty hero actions |
| 4        | Text link **See all books** → `/books`                   | always                                        |

Rules:

- One solid coral max in cluster.
- External links: `rel="noopener noreferrer"` + `target="_blank"`; optional external-icon.
- `min-h-11`, uppercase tracking ~0.24em, focus-visible gold ring.
- Hover: coral→charcoal (primary), outline→coral border (secondary).

### Loading

- URLs load async — show skeleton pills or fallback CTA immediately (don’t wait for Supabase to paint an empty gap).

---

## 2. Pull quote (cinematic)

| Item        | Spec                                                                 |
| ----------- | -------------------------------------------------------------------- |
| Height      | ~520–600px desktop; min 420 mobile                                   |
| Image       | full bleed cover; `object-cover`; plum overlay ~40–50% for text WCAG |
| Quote       | display ivory 3xl–5xl; gold accent phrase via `font-italic-display`  |
| Attribution | caps 11px ivory/80                                                   |
| Motion      | single Reveal; reduced-motion = static                               |
| A11y        | bg img alt=””; quote is real text not only image                     |

---

## 3. Inside the book

| Item        | Spec                                                               |
| ----------- | ------------------------------------------------------------------ |
| Band        | `bg-bone/40`                                                       |
| Header      | Eyebrow chip + H2 with one coral em phrase                         |
| Grid        | 2-col desktop, 1 mobile; gap-6                                     |
| Cards       | ivory, `rounded-3xl`, soft-shadow, p-8–10                          |
| Chapter no. | large display burgundy/40                                          |
| Hover       | optional hairline lift — no loud scale                             |
| Focus       | if whole card becomes link later, ring; for now static articles OK |

---

## 4. About the author

| Item   | Spec                                                    |
| ------ | ------------------------------------------------------- |
| Photo  | `rounded-3xl`, aspect 4/5, soft-shadow-lg, object-cover |
| Type   | chip + H2 with coral em on surname OK                   |
| CTA    | text link burgundy → `/about` with focus ring           |
| Rhythm | py-20 md:py-28                                          |

---

## 5. Reviews

| Item    | Spec                                                                            |
| ------- | ------------------------------------------------------------------------------- |
| Empty   | **Hide section** if zero reviews (current) OR show one calm empty — prefer hide |
| Cards   | ivory `rounded-3xl`; stars `aria-hidden`; quote display; byline caps coral      |
| Grid    | 2-col; if odd count, last can span or sit left                                  |
| Loading | don’t flash empty then populate if possible — null state until fetch settles    |

---

## 6. Email capture

Reuse home-polished `EmailCapture variant="banded"` — no fork.

---

## 7. Optional sticky buy bar (should)

After hero buy cluster scrolls off:

- Fixed bottom (mobile) or slim top-under-header (desktop) ivory bar: title truncated + primary buy (same URL logic as §Buy).
- `z-30`, border-t plum/10, safe-area padding.
- Dismiss not required.
- reduced-motion: no slide choreography required.

Skip if time-boxed — note in FE handback.

---

## Motion / a11y

- Reveal stagger ≤ 80ms.
- All interactive: focus-visible gold ring + offset ivory (dark sections: offset plum if any).
- Skip link still from root.
- Keyboard: back link, buys, about, email.

---

## EL

- Thin twin only; verify H1 “Smile” accent + long Greek subtitle wrap at 375px.
- Buy labels: use `useT()` if keys exist; else EN OK short-term — don’t block on full i18n of this page if not already wired; prefer t-keys when present.

---

## Implementation checklist

- [ ] Cover stage + `object-contain`
- [ ] Buy cluster never empty (fallback CTA)
- [ ] focus-visible on all actions
- [ ] `rounded-3xl` consistency
- [ ] Stars aria-hidden
- [ ] Quote overlay contrast check
- [ ] Optional sticky buy
- [ ] `bun run gate`
- [ ] Screenshots: hero+buys (with fallback if null URLs), quote, chapters, author, reviews, email; mobile hero

## Out of scope

- New book template system for all slugs (FYRTS only)
- WebP/CDN (P3)
- Writing new chapter copy
- Payment checkout

## Accept criteria

1. Hero never feels “broken commerce” when Amazon links missing.
2. Cover reads as premium object (parity with home featured stage).
3. Quote band cinematic but type readable.
4. Keyboard/focus obvious.
5. Page calmer and tighter — not busier.
