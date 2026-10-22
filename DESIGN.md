---
version: alpha
name: Anastasia Patience
description: Warm cream editorial personal brand — memoir luxury, coral accent, calm cinematic motion.
colors:
  ivory: "#FBF6EF"
  bone: "#FBE4D6"
  charcoal: "#1A1A1A"
  ink: "#2A2A2A"
  coral: "#E85D3A"
  coral-deep: "#D64520"
  peach: "#F4A582"
  destructive: "#C14953"
  muted-fg: "oklch(0.44 0.03 40)"
  border: "oklch(0.87 0.02 75)"
  primary: "#1A1A1A"
  secondary: "#FBE4D6"
  tertiary: "#E85D3A"
  neutral: "#FBF6EF"
  on-primary: "#FBF6EF"
  on-tertiary: "#FBF6EF"
typography:
  h1:
    fontFamily: Space Grotesk Variable
    fontSize: 3.25rem
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.015em"
  h2:
    fontFamily: Space Grotesk Variable
    fontSize: 2.25rem
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  h3:
    fontFamily: Space Grotesk Variable
    fontSize: 1.5rem
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body-md:
    fontFamily: DM Sans Variable
    fontSize: 1.0625rem
    fontWeight: 400
    lineHeight: 1.65
  body-lg:
    fontFamily: DM Sans Variable
    fontSize: 1.1875rem
    fontWeight: 400
    lineHeight: 1.7
  label-caps:
    fontFamily: DM Sans Variable
    fontSize: 0.6875rem
    fontWeight: 500
    letterSpacing: "0.22em"
  nav-caps:
    fontFamily: DM Sans Variable
    fontSize: 0.75rem
    fontWeight: 500
    letterSpacing: "0.22em"
rounded:
  sm: 0.75rem
  md: 1rem
  lg: 1.25rem
  xl: 1.75rem
  "2xl": 2.25rem
  "3xl": 2.75rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  section: 96px
components:
  button-primary:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.on-tertiary}"
    rounded: "{rounded.full}"
    padding: 15px
  button-primary-hover:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.on-primary}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.full}"
  button-ghost-hover:
    backgroundColor: "transparent"
    textColor: "{colors.coral}"
  card:
    backgroundColor: "{colors.bone}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.3xl}"
    padding: 24px
  eyebrow:
    textColor: "{colors.coral}"
    typography: "{typography.label-caps}"
---

## Overview

Anastasia Patience is a **warm cream editorial** personal brand: memoir-luxury, faith-rooted entrepreneurship, Ghana × Cyprus dual identity. The site should feel like a high-end literary magazine crossed with a calm studio — not SaaS purple, not generic “coach Canva.”

**Voice in UI:** intimate, confident, unhurried. One coral accent does the emotional work; charcoal carries gravity. Motion is cinematic but respectful (`prefers-reduced-motion`).

**Implementation source of truth:** `src/styles.css` (`@theme` + `:root`). This file freezes names/meanings for agents and handoffs. Do not invent new hex in components.

## Colors

### Brand tokens (canonical names)

| Token (CSS)    | Hex / value | Meaning (locked)                                                     |
| -------------- | ----------- | -------------------------------------------------------------------- |
| `--ivory`      | `#FBF6EF`   | Page background, cream base                                          |
| `--bone`       | `#FBE4D6`   | Soft peach surfaces / cards                                          |
| `--plum`       | `#1A1A1A`   | **Name is historical** — value is charcoal ink (text, rare dark UI)  |
| `--charcoal`   | `#1A1A1A`   | Same as plum; prefer `charcoal` in new prose                         |
| `--ink`        | `#2A2A2A`   | Softer body ink when needed                                          |
| `--burgundy`   | `#E85D3A`   | **Name is historical** — value is vibrant **coral** (primary accent) |
| `--gold`       | `#F4A582`   | Warm peach highlight / selection / ring                              |
| `--terracotta` | `#D64520`   | Deeper coral — emphasis italics, danger-adjacent, stronger hover     |

### Semantic map (shadcn)

| Semantic                  | Resolves to                                   |
| ------------------------- | --------------------------------------------- |
| `--background`            | ivory                                         |
| `--foreground`            | charcoal                                      |
| `--card`                  | bone                                          |
| `--primary`               | plum/charcoal (dark CTA surfaces when needed) |
| `--primary-foreground`    | ivory                                         |
| `--secondary` / `--muted` | bone                                          |
| `--accent`                | gold                                          |
| `--ring`                  | gold                                          |
| `--destructive`           | `#C14953`                                     |

### Name freeze rules

1. **Do not rename** CSS custom properties (`--plum`, `--burgundy`) in P1 — classnames and Tailwind color utilities already depend on them (`text-plum`, `bg-burgundy`).
2. **In docs and agent prompts**, say: _plum = charcoal ink_, _burgundy = coral accent_.
3. **Never introduce** a second coral or cream hex. Extend tokens in `styles.css` first.
4. **Admin and public share the same palette**; admin uses lower chroma density (more ivory/bone, less gold pattern).

## Typography

- **Display:** Space Grotesk Variable — headings, logo wordmarks, big numbers.
- **Body:** DM Sans Variable — UI, paragraphs, forms.
- Headings: weight 600, `letter-spacing: -0.015em`, color charcoal/plum.
- **Italic display accent:** utility `font-italic-display` → display face + coral (`burgundy`) — used for starred/`*emphasis*` in CMS headlines, not for body italics.
- **Caps labels:** 10–12px, tracking `0.22em`–`0.28em`, uppercase. Eyebrow uses burgundy + short hairline rule.
- Greek (EL): same scale; allow +5–10% line-height on long body; avoid ultra-tight tracking on Greek caps.

## Layout

- **Public content width:** ~max-w-6xl pattern already in chrome; hero can go fuller.
- **Section rhythm (P2 target):** mobile 64–80px, desktop 96–128px vertical breathing between major bands.
- **Grid:** editorial asymmetry OK (text column + large photo), but keep left edge alignment of type columns consistent across pages.
- **Admin:** denser — `max-w-6xl` main, 280px sidebar, cards `rounded-3xl` with soft border `plum/10`.

## Elevation & Depth

- Prefer **hairlines and surface tint** over heavy drop shadows.
- Utilities: `soft-shadow` / `soft-shadow-lg` (warm rgba, very low opacity).
- Primary pill may use coral-tinted soft shadow; hover deepens to charcoal shadow.
- Patterns: `pattern-bg`, `pattern-kente` — **whisper only** (≤6–8% opacity). Never loud textile wallpaper.

## Shapes

- Marketing CTAs and fields often **full pill** (`rounded-full`).
- Cards / large media: `rounded-3xl` / `blob-mask` (~1.25rem+).
- Admin nav items: softer `rounded-lg` with coral left border active.
- Radius scale in `@theme`: sm 0.75 → 3xl 2.75rem. Default `--radius: 1.25rem`.

## Components

### Buttons (two stacks — both valid)

| Stack                                | Where                 | Primary look                                                    |
| ------------------------------------ | --------------------- | --------------------------------------------------------------- |
| `Button` (`components/ui/button`)    | Public + shared Radix | Coral fill → charcoal hover; outline charcoal/15 → coral border |
| `PillButton` (`components/admin/ui`) | Admin only            | Coral fill → terracotta hover; outline plum/20                  |

**Rules:**

- Public marketing CTAs: prefer `Button` size `lg` (uppercase tracking) **or** utilities `btn-pill` + `btn-primary-pill` / `btn-ghost-pill` — match surrounding section.
- Admin actions: **only** `PillButton` / `ConfirmButton` — do not mix shadcn `Button` into admin forms without reason.
- One high-emphasis solid coral action per view cluster; secondary = outline/ghost.
- Destructive: admin `ConfirmButton` (two-click arm) or danger outline terracotta.

### Focus

- Public `Button`: `focus-visible:ring-2 ring-ring (gold) ring-offset-2 offset-background`.
- Admin inputs: `focus:border-burgundy focus:ring-4 focus:ring-burgundy/10` (no hard gold ring — keep studio quieter).
- Nav links: underline hairline grow + `focus-visible:text-burgundy` (see `SiteHeader`).
- Never remove focus styles; keyboard path is ship criteria.

### Eyebrow / divider

- `Eyebrow`: burgundy caps + 32px hairline.
- `hairline` utility: gold gradient fade — section separators.

### Motion

- Reveal / float / Framer OK on public if `prefers-reduced-motion` respected (already in base CSS).
- Admin: functional transitions only (drawer 300ms); no float decoration.

## Do's and Don'ts

- **Do** treat Supabase CMS as content source; design empty/loading/error as first-class states (bone card + calm copy + one CTA).
- **Do** keep EN/EL visual parity (same components; type length flex).
- **Do** keep TipTap / heavy admin chrome out of public bundles (perf).
- **Don't** add dark mode in P1–P2.
- **Don't** restyle public pages until Phase 2 page specs + screenshot accept.
- **Don't** “fix” token names by mass-renaming `plum`/`burgundy` classes.
- **Don't** use pure black `#000` or cool gray SaaS neutrals.
- **Don't** stack multiple coral CTAs in one fold.
