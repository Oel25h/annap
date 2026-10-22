# Phase 1 — Token / name freeze

**Owner:** design-lead  
**Status:** locked for P1–P2  
**Source of truth:** `src/styles.css`  
**Agent mirror:** root `DESIGN.md`

## Locked brand values

| CSS token       | Value     | Human name                       |
| --------------- | --------- | -------------------------------- |
| `--ivory`       | `#fbf6ef` | Cream background                 |
| `--bone`        | `#fbe4d6` | Soft peach surface               |
| `--plum`        | `#1a1a1a` | Charcoal ink (token name frozen) |
| `--charcoal`    | `#1a1a1a` | Charcoal ink (alias)             |
| `--ink`         | `#2a2a2a` | Soft body ink                    |
| `--burgundy`    | `#e85d3a` | Coral accent (token name frozen) |
| `--gold`        | `#f4a582` | Peach highlight / ring           |
| `--terracotta`  | `#d64520` | Deep coral                       |
| `--destructive` | `#c14953` | Error / destroy                  |

## Name freeze (critical)

| Say in specs    | CSS / Tailwind utility                     | Is NOT        |
| --------------- | ------------------------------------------ | ------------- |
| Charcoal ink    | `plum`, `charcoal`, `text-plum`            | Purple plum   |
| Coral accent    | `burgundy`, `text-burgundy`, `bg-burgundy` | Wine burgundy |
| Peach highlight | `gold`, `bg-gold`                          | Metallic gold |

**P1 decision:** keep property names (`plum`/`burgundy`) to avoid churn across hundreds of classes. Document meaning only. Optional future rename = dedicated migration PR after P5.

## Type freeze

| Role          | Family                 | Notes                                                |
| ------------- | ---------------------- | ---------------------------------------------------- |
| Display       | Space Grotesk Variable | `--font-display`, headings                           |
| Body / UI     | DM Sans Variable       | `--font-sans`, body                                  |
| Accent phrase | `font-italic-display`  | Display + coral; style normal (not true italic file) |

## Radius / motion freeze

- Radius scale: sm 0.75 → 3xl 2.75rem; pills `9999px`.
- Reduced motion: existing `@media (prefers-reduced-motion: reduce)` must remain.
- Pattern utilities stay ≤ low opacity; no new loud backgrounds without design review.

## Semantic → brand (shadcn)

Do not redefine casually:

- `background` → ivory
- `foreground` → charcoal
- `card` → bone
- `primary` → charcoal (dark)
- `accent` / `ring` → gold
- Marketing “brand CTA fill” is **coral (`burgundy`)**, not semantic `primary`

## Acceptance

- [x] Values documented
- [x] Historical names explained
- [x] `DESIGN.md` written
- [ ] FE confirms no new hex outside tokens in P1 admin polish
- [ ] P2 page work uses tokens only
