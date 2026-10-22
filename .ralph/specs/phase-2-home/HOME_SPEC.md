# Phase 2.1 — Home elevation spec

**Route:** `/` + thin EL twin (same component)  
**Owner:** design-lead → **@frontend-lead** implement  
**Accept:** screenshot EN desktop + mobile; EL spot-check hero + offer  
**Refs:** `DESIGN.md`, `NORTH_STAR.md`, live `http://localhost:8081/`  
**Constraint:** elevate existing system — no new palette, no layout rewrite from scratch

---

## Baseline (keep)

Section order stays:

1. Hero
2. Social proof counters
3. Who I am
4. What I offer (bento)
5. Featured book
6. Latest letters
7. Testimonial (dark plum band)
8. Email capture (`EmailCapture` banded)

Tokens, fonts, coral CTAs, `Eyebrow` / `Reveal` / CMS headline star-italics stay.

---

## Live QA notes (2026-08-23, desktop)

| Observation                                                         | Spec response                             |
| ------------------------------------------------------------------- | ----------------------------------------- |
| Hero already strong: cream field, coral “pain”, portrait, dual CTAs | Polish craft, don’t reinvent              |
| Proof strip painted **0 / 0+** on first fold                        | Counter must not look broken; see §2      |
| Hero badge ≠ `Eyebrow` component                                    | Unify accent language lightly             |
| Featured book cover floats without stage                            | Add cinematic pedestal (Stripe Press bar) |
| Primary book CTA goes to `/books` only                              | Prefer featured slug detail when known    |
| Infinite scroll-cue bounce                                          | Gate on `prefers-reduced-motion`          |

---

## 1. Hero

### Hierarchy (locked)

- Pill eyebrow (CMS `hero_eyebrow`) → **one** H1 (CMS headline with coral accent spans) → sub ≤ ~2 lines desktop → **one** solid coral CTA + one outline secondary → role chips row.
- Portrait right (desktop), below type on mobile.

### Elevation changes

| Item           | Do                                                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type scale     | Keep large display; cap line-height ~0.95–1.0; ensure EL long words wrap without overflow (`break-words` on H1 if needed)                                                         |
| Accent         | Keep `font-italic-display` / coral on CMS `*pain*` segments only — max ~1–3 words coral per H1                                                                                    |
| CTAs           | Solid: coral → charcoal hover (match `btn-primary-pill`). Outline: charcoal/20 → coral border/text. Add **focus-visible** gold ring + offset (Stack A). Min tap 44×44             |
| Portrait frame | `rounded-2xl` → **`rounded-3xl`**; 1px `border-plum/10`; rear bone slab offset `translate(12px, 12px)` or current inset slab refined so depth reads magazine, not “stuck sticker” |
| Portrait media | `object-cover` keep; add `sizes` attribute for future P3; lazy **not** on LCP hero img                                                                                            |
| Vertical label | Keep “Patience Media House” if present in asset/CSS — don’t add noisy overlays                                                                                                    |
| Scroll cue     | Delay ≤0.8s; **no infinite y-loop** when `prefers-reduced-motion: reduce` (static icon)                                                                                           |
| Badge          | Optional: swap custom pill for `Eyebrow` **or** keep pill but match tracking 0.28em + dot — pick one pattern sitewide later; for home keep pill if CMS expects chip look          |
| Motion         | Keep subtle parallax; disable y-transform under reduced-motion (opacity OK)                                                                                                       |

### Don’t

- Second solid coral in hero
- Gradient mesh backgrounds
- Auto-playing video

---

## 2. Social proof strip

### Problem

Counters sit at **0** until `useInView` fires — looks like empty CMS / broken stats.

### Spec

| Item           | Do                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Initial paint  | Render **final** number immediately as text for SSR/hydration stability **or** skeleton bone bars — never stuck “0+” for >300ms in view |
| Reduced motion | Show final counts, no RAF tween                                                                                                         |
| In-view motion | Keep ease-out count once; `once: true`                                                                                                  |
| Layout         | 2×2 mobile / 4-col desktop; hairline dividers `charcoal/10`; bone/60 band OK                                                            |
| Type           | Display numbers; labels 10px caps tracking 0.28em plum/55                                                                               |
| Values         | Keep current copy constants unless CMS later; don’t invent metrics                                                                      |

---

## 3. Who I am

| Item                           | Do                                                                       |
| ------------------------------ | ------------------------------------------------------------------------ |
| Rhythm                         | `py-24 md:py-32` (slightly tighten 36→32 if page feels long)             |
| Photo                          | `rounded-3xl`; aspect 4/5; soft-shadow optional very light               |
| Float chip (“Based in Cyprus”) | Keep; ensure doesn’t clip on ≤375px (stack under photo if needed)        |
| CTA                            | Charcoal solid → coral hover is OK (secondary narrative CTA); focus ring |
| Body                           | max measure ~36–40rem; `text-ink`                                        |

---

## 4. What I offer (bento)

### Structure (keep grid)

- Books: tall dark `md:col-span-2 row-span-2`
- Masterclasses: wide `md:col-span-4`
- Community + Journal: `md:col-span-2` each

### Elevation

| Item        | Do                                                                                  |
| ----------- | ----------------------------------------------------------------------------------- |
| Radius      | All tiles **`rounded-3xl`**                                                         |
| Hover       | Border deepen **or** soft-shadow-lg; 200–300ms; no scale >1.01                      |
| Books tile  | Keep plum/charcoal field + gold meta; blur orb ≤ current opacity                    |
| Ivory tiles | `bg-ivory` on `bone/40` section — OK contrast; hover `border-plum/25`               |
| Icons       | 48px circle; coral/10 + coral icon on light; gold on dark books tile                |
| Focus       | Entire card is link — visible focus ring on card (`focus-visible:ring-2 ring-gold`) |
| Copy        | No truncation mid-word; EL check titles                                             |

---

## 5. Featured book (priority craft)

Stripe Press bar: book as artifact.

| Item        | Do                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| Stage       | Cover on subtle bone/ivory rounded stage + `soft-shadow-lg`; optional 2–4° rotate **max** (or none — prefer clean) |
| Cover       | `object-contain` aspect 3/4; never squash                                                                          |
| Type        | Eyebrow → title display → tagline lg → stars + review line → description clamp ~180 chars → CTAs                   |
| Stars       | `aria-hidden` on decorative row; visible text already has reviews line                                             |
| Primary CTA | Link to **featured book detail** (`/books/{slug}`) when slug known from CMS; fallback `/books`                     |
| Secondary   | Text link “See all books” → `/books`                                                                               |
| Loading     | If CMS pending, keep static fallback (already) without layout shift — reserve min-height on cover                  |

---

## 6. Latest letters

| Item    | Do                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------- |
| Grid    | 3-col desktop; 1-col mobile; gap-6–8                                                                          |
| Card    | `rounded-3xl`; image 4/3; category chip ivory/95 coral text                                                   |
| Hover   | Image `scale-105` 400ms ease; title → burgundy optional                                                       |
| Excerpt | Clamp 2–3 lines (`line-clamp-3`) instead of hard 110 chars when easy                                          |
| Empty   | If zero posts after load: one calm bone card “New letters soon” + link blog — don’t render three broken cards |
| Loading | Optional 3 bone skeleton cards matching geometry                                                              |
| Dates   | Prefer formatted locale date; don’t show raw ISO if ugly                                                      |

---

## 7. Testimonial band

| Item       | Do                                                      |
| ---------- | ------------------------------------------------------- |
| Field      | `bg-plum` ivory type — keep high drama once per page    |
| Quote mark | Gold display oversized — keep; decorative `aria-hidden` |
| Quote body | Display 2xl–4xl; max-w-4xl; balanced line breaks        |
| Avatar     | Initial circle burgundy OK; if CMS photo later, swap    |
| Motion     | Single Reveal; no parallax here                         |

---

## 8. Email capture (banded)

| Item      | Do                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------- |
| Container | Keep large radius bone panel; ensure focus styles on email input match admin-quality coral ring |
| CTA       | One coral submit; success state already Check — keep calm                                       |
| Mobile    | Stack form full width; no horizontal overflow                                                   |
| A11y      | Associate label; errors if you add validation later must be text not color-only                 |

---

## Global home rules

1. **One coral solid CTA per fold** (hero guide, book read, email submit are separate folds — OK).
2. **Section separators:** prefer `border-plum/8` or bone band alternation — avoid new loud patterns.
3. **Reveal stagger** ≤ 80ms between siblings.
4. **No TipTap / admin imports** on home.
5. **EN/EL:** same DOM; verify Greek hero H1 + offer titles don’t collide CTAs.
6. **Tokens only** — no new hex.

---

## Implementation checklist (@frontend-lead)

- [ ] Hero: rounded-3xl frame, focus rings, reduced-motion parallax + scroll cue
- [ ] Counters: no persistent 0 flash; reduced-motion = final values
- [ ] Offer + letter cards: rounded-3xl, card focus-visible
- [ ] Featured book: stage/shadow; CTA to detail slug when available
- [ ] Letters: line-clamp; empty state
- [ ] Email: input focus ring polish if weak
- [ ] `bun run gate` green
- [ ] Screenshots: desktop hero, proof+who, offer, book, letters+quote+email; mobile hero+offer

## Out of scope (this slice)

- Image WebP/CDN (P3)
- Header/footer chrome redesign (P2.7)
- Copy rewrite / new sections
- Dark mode

## Accept criteria (design)

1. Hero still “magazine first fold” — calmer, not busier.
2. Stats never read as broken zeros.
3. Book block feels premium object, not flat PNG.
4. Motion respectful; keyboard focus obvious on all home CTAs/cards.
5. EL hero doesn’t overflow or stack into portrait awkwardly at 375px.
