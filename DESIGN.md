---
version: 3.1.0
name: "Anastasia Patience — The Open Book"
description: >-
  Design system for the bilingual (EN / EL under /el) personal site and admin
  studio of Anastasia Patience: author of "Find Your Reason to Smile",
  storyteller, founder of Patience Media House and the Patience Humanitarian
  Foundation, faith-rooted, shaped by Ghana and Cyprus. One signature idea
  carries the brand: directly under an asymmetric portrait hero, her audiobook
  opens as a book spread. The verso sets the current chapter's opening line and
  holds the controls; the recto is the dotted-leader contents with a ribbon
  bookmark. Everything else is quiet: flat, warm, real photography, one grid,
  one of everything.
colors:
  palette:
    tangerine: "#F27329"
    burnt-orange: "#C2410C"
    apricot: "#FFB27A"
    peach-cream: "#FFF1E6"
    warm-ivory: "#FFFAF5"
    cocoa-ink: "#3B1F14"
    berry: "#7A2E4A"
    blush: "#F7C9C0"
    cocoa-night: "#1F120C"
  tints:
    cocoa-ink-76: "rgb(59 31 20 / .76)"
    cocoa-ink-68: "rgb(59 31 20 / .68)"
    cocoa-ink-52: "rgb(59 31 20 / .52)"
    peach-cream-76: "rgb(255 241 230 / .76)"
    peach-cream-68: "rgb(255 241 230 / .68)"
    peach-cream-52: "rgb(255 241 230 / .52)"
    apricot-32: "rgb(255 178 122 / .32)"
    apricot-48: "rgb(255 178 122 / .48)"
    warm-ivory-88: "rgb(255 250 245 / .88)"
    cocoa-night-88: "rgb(31 18 12 / .88)"
  light:
    bg: warm-ivory
    bg-alt: peach-cream
    surface: warm-ivory
    surface-alt: peach-cream
    text: cocoa-ink
    text-secondary: cocoa-ink-76
    text-tertiary: cocoa-ink-68
    accent-text: burnt-orange
    hairline: apricot
    leader: apricot
    field-border: cocoa-ink-52
    track: cocoa-ink-52
    action: tangerine
    on-action: cocoa-ink
    action-hover: burnt-orange
    on-action-hover: warm-ivory
    selected: cocoa-ink
    on-selected: warm-ivory
    ribbon: tangerine
    focus: burnt-orange
    header-bg: warm-ivory-88
    selection: blush
    error: berry
    on-error: warm-ivory
  dark:
    bg: cocoa-night
    bg-alt: cocoa-night
    surface: cocoa-ink
    surface-alt: cocoa-ink
    text: peach-cream
    text-secondary: peach-cream-76
    text-tertiary: peach-cream-68
    accent-text: apricot
    hairline: apricot-32
    leader: apricot-48
    field-border: peach-cream-52
    track: peach-cream-52
    action: tangerine
    on-action: cocoa-ink
    action-hover: apricot
    on-action-hover: cocoa-ink
    selected: peach-cream
    on-selected: cocoa-night
    ribbon: tangerine
    focus: apricot
    header-bg: cocoa-night-88
    selection: blush
    error: blush
    on-error: cocoa-ink
typography:
  families:
    display: "Noto Serif Display Variable"
    serif: "Source Serif 4 Variable"
    sans: "Noto Sans Variable"
  units: "rem + vw inside clamp(), so browser zoom and the reader's default font size always scale type"
  roles:
    display-xl: { family: display, size: "clamp(2.75rem, 1.5rem + 4vw, 5.5rem)", px: "44-88", weight: "400 (360 from 1024px)", line-height: 1.02, tracking: "-0.022em", use: "h1, one per page" }
    display-xl-el: { family: display, size: "clamp(2.5rem, 1.375rem + 3.5vw, 4.75rem)", px: "40-76", weight: 400, line-height: 1.04, tracking: "-0.016em", use: "h1 on /el" }
    display-l: { family: display, size: "clamp(2.125rem, 1.5rem + 2vw, 3.5rem)", px: "34-56", weight: 400, line-height: 1.08, tracking: "-0.016em", use: "h2, the quote, the mission, the lead story title" }
    display-l-el: { family: display, size: "clamp(1.75rem, 1.125rem + 2.4vw, 3.25rem)", px: "28-52", weight: 400, line-height: 1.1, tracking: "-0.012em", use: "h2 and quotes on /el" }
    display-m: { family: display, size: "clamp(1.75rem, 1.25rem + 1vw, 2.25rem)", px: "28-36", weight: 400, line-height: 1.15, tracking: "-0.01em", use: "the opening line on the verso, feature titles, the eBook card; never below 28px" }
    title: { family: serif, size: "clamp(1.25rem, 1.125rem + .25vw, 1.375rem)", px: "20-22", weight: 600, line-height: 1.3, use: "h3, list titles, the wordmark" }
    lead: { family: serif, size: "clamp(1.1875rem, 1.0625rem + .4vw, 1.375rem)", px: "19-22", weight: 400, line-height: 1.5, use: "standfirst, the reader review" }
    body: { family: serif, size: "clamp(1.0625rem, 1rem + .25vw, 1.1875rem)", px: "17-19", weight: 400, line-height: 1.65, use: "reading" }
    small: { family: "serif or sans", size: "1rem", line-height: 1.5, use: "captions, inputs, edition titles" }
    ui: { family: sans, size: ".9375rem", weight: "500-600", line-height: 1.25, use: "buttons, nav, controls" }
    meta: { family: sans, size: ".8125rem", weight: "400-600", line-height: 1.4, use: "dates, durations, helper text, category and column labels (600)" }
    label: { family: sans, size: ".75rem", weight: 600, line-height: 1.3, tracking: 0, case: "as written", use: "badges, duration chips, skip-button numerals" }
  rules:
    italic: "One italic accent on the whole site: the hope word of the home h1. Book titles in <cite> keep the conventional italic."
    capitals: "No tracked capitals and no text-transform: uppercase anywhere"
    numerals: "No section symbols and no roman numerals; arabic numbers only where they count something real (chapters)"
spacing:
  base: 4px
  scale: [4, 8, 12, 16, 24, 32, 48, 64, 96, 128]
  tokens: { space-1: 4, space-2: 8, space-3: 12, space-4: 16, space-5: 24, space-6: 32, space-7: 48, space-8: 64, space-9: 96, space-10: 128 }
  tailwind-steps: [1, 2, 3, 4, 6, 8, 12, 16, 24, 32]
  grid: { columns: 12, from: 1024, gap: 32, "column x at 1440": [80, 189, 299, 408, 517, 627, 736, 845, 955, 1064, 1173, 1283] }
  gutter: { "0": 16, "720": 32, "1180": 64 }
  content-max: 1280
  text-max: 720
  section: { section-pt: "64, 96 from 1024", section-pb: "64, 128 from 1024", head-gap: "32, 64 from 1024" }
  breakpoints: { xs: 360, sm: 640, md: 720, lg: 1024, xl: 1180 }
  sizes: { control: 48, control-sm: 44, row: 56, header: "64 (72 from 1024)", play: 72, listen-disc: 56, mini-cover: 32, edition-cover: 36, upnext-thumb: 96 }
radius:
  value: 12px
  rule: "Every rounded corner is 12px. Circles only for round controls, play badges, dots and the switch thumb. Non-text marks under 40px (cover thumbnails, the checkbox) are square."
  concentric: "outer = 12 + gap (studio swatch ring: 12 + 5 = 17)"
  arch: "50cqi 50cqi 12px 12px, filled with surface-alt, no hairline frame; her portrait and the book cover only"
motion:
  reveal: none (no scroll-triggered reveals; nothing above or below the fold starts hidden)
  hover: { duration: 200ms, properties: [color, background-color, border-color, text-decoration-color, text-decoration-thickness] }
  loops: none
  autoplay: none
  scroll: "smooth only for in-page jumps the reader starts (html:focus-within)"
  allowed: "menu, sheet and lightbox open and close; the audio progress; a thin Tangerine line during slow navigations"
  reduced-motion: "smooth scroll off; transitions 0.01ms"
---

# Anastasia Patience — The Open Book

**The idea.** Her voice, and her words, at the same time. Directly under the hero, the
audiobook opens as a book lying flat: the **verso** sets the current chapter's opening
line large in Noto Serif Display and holds the transport; the **recto** is the contents
page, with dotted leaders and a Tangerine **ribbon** bookmark at the current chapter.
A visitor sees the sentence she is about to hear. Nothing else on the site competes
with that spread: every other section is a plain heading, its content, and air.

Reference mocks live in `docs/design/mocks/`:

- `index.html` and `el.html` (home), `about.html` and `el-about.html`, `studio.html`,
  styled by `site.css` with the same token names as `src/styles/tokens.css`. Open them
  from a checkout; they load the repo's own fonts and photographs.
- Screenshots: `desktop.jpg`, `mobile.jpg`, `greek.jpg`, `dark.jpg`, `about.jpg`,
  `studio.jpg`, `studio-mobile.jpg`.
- The mocks show the home and About pages with their seed copy. Every other page is
  built from the same sections, so it follows the same rules.

## What changed from 2.0 ("The Typeset Book")

The 2.0 system dressed every section as a book chapter. Review found the costume louder
than the content. 3.0 keeps the one book device that does real work and removes the rest.

**The page**
- **Signature.** The player is now the open-book spread. The four progress displays are
  down to two: the scrubber for the chapter, and played ticks for the book. The ribbon
  is a short tab, no longer a full-height bar.
- **Hero.** It is asymmetric on the 12-column grid: the portrait is on columns 1–5
  (about 514px at 1440), and the words are left-aligned on column 7. The meta strip is
  gone. The hero ends near 764px, so the player's editions show above the fold at
  1440×900.
- **Scaffolding removed:**
  - running heads, section labels, `§`, roman numerals and the asterism;
  - "Ex libris", the colophon, the Foreword aside, and numbered foundation and values
    lists;
  - every tracked-capitals label.
- **Italic.** It now appears exactly once: the hope word of the home h1. The quote,
  the About h1 and the mission are roman. The Studio's `*stars*` syntax is gone.
- **One grid.** It has 12 columns with 32px gaps from 1024px, and every block snaps to
  a column. There are no more 5–10px near-misses.
- **Real copy and photos:**
  - the reader review is Ama's own words, credited "Ama, Accra";
  - the Foundation has a real photograph and a "Volunteer" action;
  - Stories leads with one story, and the hero portrait is never reused.

**States, Greek and accessibility**
- **States.** The home page shows one consistent first-visit state: "Ready to listen",
  chapter 1, 0:00, paused. The hero sub-label matches it.
- **Greek fixes:**
  - meta separators are drawn by CSS, so a dot can never start a line;
  - no-break spaces in «4 ώρ. 10 λεπ.»;
  - the decimal comma «4,9»;
  - `lang="en"` and «Αγγλική έκδοση» on the English edition;
  - /el links stay in Greek;
  - a dedicated `display-l-el` size.
- **Accessibility fixes:**
  - type set in rem + vw;
  - a native radio group for editions and button rows for chapters;
  - a 44px scrubber on a `--color-track` that reaches 3:1;
  - one selected style, `--color-selected` / `--color-on-selected`;
  - forced-colours rules, cleaner landmarks, an inert studio preview, a modal phone
    sheet, and a Publish confirmation.
- **Save state.** It lives in the top bar ("Saved just now"); there are no toasts.

---

## 1. Principles

1. **One signature, then quiet.** The open-book spread is the only staged moment. Every
   other section is heading + content. No eyebrows, no numerals, no ornaments.
2. **Her voice first.** "Listen to the audiobook" is the single first action. The player
   sits directly under the hero in both languages and cannot be moved in the studio.
3. **One of each.** One grid, one type scale, one spacing scale, one radius (12px), one
   hairline, one selected style, one icon style (24px, 1.5 stroke), one italic.
4. **Warm, never loud.** Tangerine is a fill for the one action that matters in a view.
   Orange *text* is always Burnt orange (Apricot on dark grounds).
   **Bright, like the original site.** Every public page is warm ivory with peach bands:
   no dark, cocoa, brown or berry backgrounds anywhere, whatever the reader's system
   setting (Joel, 2026-10-23). Dark mode exists only as an opt-in and is cocoa, never
   black.
5. **Her photos.** The photographs Joel supplied with the site (`src/assets/`, seeded
   through `scripts/content/media.ts`) and real copy from `en.ts`, `el.ts` and
   `site.ts`, word for word. A reader's quote is never edited. No blobs, gradients,
   glass cards or emoji.
6. **Two languages, one layout.** Greek runs 20–30% longer. Every component is set with
   the Greek string first and checked at 320, 390, 1024 and 1440.
7. **Phones first.** Every page, the player and the studio work at 320px with no
   horizontal scroll and no lost function.

---

## 2. Colour

### 2.1 Palette (the only hex values in the system)

| Token | Hex | Role |
|---|---|---|
| `--color-tangerine` | #F27329 | Fill for the primary action, the play buttons, the ribbon and the skip link. Never text, never a border, never under white or peach text. |
| `--color-burnt-orange` | #C2410C | All orange text and links on light grounds. Also the focus ring, the scrubber fill and thumb, the primary hover fill, and the studio selection outline and tag. |
| `--color-apricot` | #FFB27A | Hairlines, dot leaders and card edges on light. On dark: accent text, focus and fills. The Stale badge fill. |
| `--color-peach-cream` | #FFF1E6 | Alternate band, the eBook card, arch fill; text and selected fill on dark. |
| `--color-warm-ivory` | #FFFAF5 | Page and surface; text on selected fills. |
| `--color-cocoa-ink` | #3B1F14 | Text. Also the selected fill, text on Tangerine and the dark-mode surface. |
| `--color-berry` | #7A2E4A | Error text, Missing badge text, Delete. Never a fill behind text. |
| `--color-blush` | #F7C9C0 | Text selection, Missing badge fill, error text on dark. |
| `--color-cocoa-night` | #1F120C | Dark-mode page. |

**Named tints** exist at fixed opacities only:
- `cocoa-ink-76 / -68 / -52`;
- `peach-cream-76 / -68 / -52`;
- `apricot-32 / -48`;
- `warm-ivory-88`, `cocoa-night-88`.

No other alpha values. The `-52` tints are for borders, tracks and the dialog scrim,
never for text.

### 2.2 Semantic tokens

Components use semantic tokens, never palette names. The exceptions are the band
utilities, the status badges, the video chips and the studio swatches.

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--color-bg` | warm-ivory | cocoa-night | page |
| `--color-bg-alt` | peach-cream | cocoa-night | peach band; in dark it becomes night with hairline top and bottom rules |
| `--color-surface` | warm-ivory | cocoa-ink | the spread, inputs, cards |
| `--color-surface-alt` | peach-cream | cocoa-ink | the eBook card, the arch fill |
| `--color-text` | cocoa-ink · 14.54 | peach-cream · 16.50 | |
| `--color-text-secondary` | cocoa-ink-76 · 6.79 | peach-cream-76 · 9.77 | leads, captions, unselected editions |
| `--color-text-tertiary` | cocoa-ink-68 · 5.27 | peach-cream-68 · 8.06 | meta, numbers, durations, hidden rows |
| `--color-accent-text` | burnt-orange · 4.99 (4.68 on peach) | apricot · 10.35 | links' underline, the current chapter, category labels |
| `--color-hairline` | apricot | apricot-32 | decorative rules and card edges only |
| `--color-leader` | apricot | apricot-48 | contents dot leaders |
| `--color-field-border` | cocoa-ink-52 · 3.27 | peach-cream-52 · 5.17 | inputs, quiet buttons, segmented groups |
| `--color-track` | cocoa-ink-52 · 3.27 (3.20 on peach) | peach-cream-52 · 5.17 (4.73 on cocoa) | scrubber track, switch track |
| `--color-action` / `--color-on-action` | tangerine / cocoa-ink · 5.22 | same | |
| `--color-action-hover` / `--color-on-action-hover` | burnt-orange / warm-ivory · 4.99 | apricot / cocoa-ink · 8.55 | |
| `--color-selected` / `--color-on-selected` | cocoa-ink / warm-ivory · 14.54 | peach-cream / cocoa-night · 16.50 | the one selected style |
| `--color-ribbon` | tangerine | tangerine | the bookmark tab |
| `--color-focus` | burnt-orange | apricot | 2px outline |
| `--color-header-bg` | warm-ivory-88 | cocoa-night-88 | with the one blur (14px) |
| `--color-selection` | blush, cocoa text · 10.11 | same | |
| `--color-error` / `--color-on-error` | berry · 8.74 (8.19 on peach) / warm-ivory | blush · 12.23 / cocoa-ink | |
| `--color-status-*` | see Badges | | translation status in the studio |

### 2.3 Rules

- **Orange text is Burnt orange** on light grounds (Apricot in opt-in dark mode).
  Tangerine is never text (2.79 on ivory).
- **Text on Tangerine is Cocoa** (5.22). Never white or peach on Tangerine.
- A Tangerine fill is always identified by its Cocoa label or glyph, never by the fill
  alone. The fill does not need to contrast with the page; its label does.
- **One Tangerine fill per view at rest.** In order down the page:
  - the hero listen disc;
  - the player's play button;
  - Donate;
  - Subscribe.

  The header "Free eBook" is a quiet (outlined) button, so the hero Listen stays the
  single first action.
- **One selected style.** Selected = `--color-selected` fill with `--color-on-selected`
  text and icons. It applies to studio rows, segments, variant tiles, the switch track,
  the checkbox and the language row in the menu. Two exceptions:
  - editions are a list, not controls on a fill: they select with text colour plus a
    check;
  - swatches select with a ring plus a tick (see Studio).

  Peach fill plus Burnt border is retired.
- **Focus is never selection.** Focus is always a separate 2px `--color-focus` ring. On
  a selected fill the ring flips to `--color-on-selected`, because Burnt on Cocoa is
  only 2.91.
- Berry only for errors, Missing and Delete. Blush only for selection, Missing and
  dark-mode errors.
- **Dark mode maps semantics, not pixels:**
  - ivory becomes cocoa-night and surfaces become cocoa-ink;
  - peach bands collapse to night with hairline rules;
  - orange text becomes Apricot, and Tangerine fills stay Tangerine with Cocoa labels.

  Photos are never dimmed or filtered.
- Theme: the site is light by default and does **not** follow `prefers-color-scheme`.
  Only `<html class="dark">` opts into dark mode.

### 2.4 Contrast guard rails

These are computed with WCAG 2.x relative luminance, with alpha tints composited on
their ground. Every text pair in the system is in the first table.

| Pair (text or mark on ground) | Ratio | Where |
|---|---|---|
| Cocoa on Ivory / Peach | 14.54 / 13.63 | text |
| Cocoa-76 on Ivory / Peach | 6.79 / 6.59 | secondary |
| Cocoa-68 on Ivory / Peach | 5.27 / 5.11 | tertiary, meta, hidden rows |
| Burnt on Ivory / Peach | 4.99 / 4.68 | accent text, focus ring, scrubber thumb |
| Cocoa on Tangerine | 5.22 | primary buttons, play, skip link |
| Ivory on Burnt | 4.99 | primary hover, the studio selection tag |
| Ivory on Cocoa (selected) | 14.54 | selected rows, segments, tiles |
| Berry on Ivory / Peach | 8.74 / 8.19 | errors |
| Berry on Blush | 6.07 | Missing badge |
| Cocoa on Apricot | 8.55 | Stale badge |
| Cocoa on Blush | 10.11 | text selection |
| Peach on Night / Cocoa | 16.50 / 13.63 | opt-in dark mode |
| Peach-76 on Night / Cocoa | 9.77 / 8.47 | |
| Peach-68 on Night / Cocoa | 8.06 / 7.06 | |
| Apricot on Night / Cocoa | 10.35 / 8.55 | dark accent and focus |
| Night on Peach (dark selected) | 16.50 | |
| Night on Apricot (dark selection tag) | 10.35 | |
| Blush on Night / Cocoa | 12.23 / 10.11 | dark errors |

Non-text (WCAG 1.4.11, 3:1):

| Mark | Ratio |
|---|---|
| Field border and track, Cocoa-52 on Ivory / Peach | 3.27 / 3.20 |
| Field border and track, Peach-52 on Night / Cocoa | 5.17 / 4.73 |
| Focus ring, Burnt on Ivory / Peach | 4.99 / 4.68 |
| Focus ring, Apricot on Night / Cocoa | 10.35 / 8.55 |
| Focus ring on selected fills (on-selected) | 14.54 / 16.50 |
| Scrubber thumb, Burnt with a 4px surface ring | 4.99 |

The scrubber fill against the track is 1.53 in light and 1.81 in dark. The 20px thumb
carries the position, so the fill is decoration.

**Never** (each is below AA):
- Burnt text on Blush (3.47), Apricot (2.93), Night (3.53) or Cocoa (2.91).
- Ivory or Peach text on Tangerine (2.79 and 2.61).
- Tangerine or Apricot as text on light grounds (2.79 and 1.70).
- Opacity or a tint applied to Burnt text, which is already the tightest pair (4.68 on
  peach).
- Hairlines (Apricot 1.70 / 1.59, Apricot-32 2.15) as the only boundary of a control:
  every control edge uses `--color-field-border` or `--color-track`.
- An icon-only Tangerine element without a Cocoa glyph.
- The focus colour drawn on a selected fill: flip it to `--color-on-selected`.

---

## 3. Typography

Three families, one job each, loaded from `@fontsource-variable` (Latin + Greek subsets).
Noto Serif Display ships cut to the weights it uses (360 to 400, in `src/assets/fonts`),
and its roman face is preloaded, since it sets every h1:

- **Noto Serif Display** — headlines and the opening line only, **28px and up**. Never
  for UI, never below 28px.
- **Source Serif 4** — reading: body, leads, titles, captions, the review, the wordmark,
  list and chapter titles.
- **Noto Sans** — interface: buttons, nav, labels, meta, forms, the studio.

All sizes are in **rem plus a vw term** inside `clamp()`, so browser zoom and the
reader's default font size always scale the text (WCAG 1.4.4; no vw-only sizes).

| Role | Token | Family | Size (px at 16px root) | Weight | Line | Tracking |
|---|---|---|---|---|---|---|
| Display XL (h1) | `--text-display-xl` | Display | clamp(2.75rem, 1.5rem + 4vw, 5.5rem) · 44–88 | 400; 360 ≥1024 | 1.02 | −0.022em |
| Display XL Greek | `--text-display-xl-el` | Display | clamp(2.5rem, 1.375rem + 3.5vw, 4.75rem) · 40–76 | 400 | 1.04 | −0.016em |
| Display L (h2) | `--text-display-l` | Display | clamp(2.125rem, 1.5rem + 2vw, 3.5rem) · 34–56 | 400 | 1.08 | −0.016em |
| Display L Greek | `--text-display-l-el` | Display | clamp(1.75rem, 1.125rem + 2.4vw, 3.25rem) · 28–52 | 400 | 1.1 | −0.012em |
| Display M | `--text-display-m` | Display | clamp(1.75rem, 1.25rem + 1vw, 2.25rem) · 28–36 | 400 | 1.15 | −0.01em |
| Title (h3) | `--text-title` | Serif | clamp(1.25rem, 1.125rem + .25vw, 1.375rem) · 20–22 | 600 | 1.3 | −0.005em |
| Lead | `--text-lead` | Serif | clamp(1.1875rem, 1.0625rem + .4vw, 1.375rem) · 19–22 | 400 | 1.5 | 0 |
| Body | `--text-body` | Serif | clamp(1.0625rem, 1rem + .25vw, 1.1875rem) · 17–19 | 400 | 1.65 | 0 |
| Small | `--text-small` | Serif or Sans | 1rem · 16 | 400 | 1.5 | 0 |
| UI | `--text-ui` | Sans | .9375rem · 15 | 500–600 | 1.25 | 0 |
| Meta | `--text-meta` | Sans | .8125rem · 13 | 400–600 | 1.4 | 0 |
| Label | `--text-label` | Sans | .75rem · 12 | 600 | 1.3 | 0 |

Tailwind's own size names survive only as aliases onto this scale:
- `text-xs` 12, `text-sm` 15, `text-base` 16;
- `text-lg` body, `text-xl` title;
- `text-2xl` display-m, `text-3xl` display-l, `text-4xl` display-xl.

**Rules**

- **One italic accent on the whole site**: the hope word of the home h1, set in
  `--color-accent-text`.
  - EN "Turning pain / into *purpose.*"; EL «Μετατρέπω τον πόνο σε *σκοπό.*».
  - `h2 em` and `h3 em` render roman.
  - The quote, the About h1, the mission and every caption are roman.
  - The one other italic is the typographic convention for a work's title inside
    `<cite>`, for example the quote's source.
- **No tracked capitals.** No `text-transform: uppercase` and no letter-spacing on
  capitals, anywhere. That includes the EN / ΕΛ codes and the studio.
  - Category labels ("Purpose & Faith") and footer column labels ("Explore") are Meta
    at 600, in the case they are written.
  - Badges and duration chips use Label (12px/600, untracked).
- **No ornaments.** No `§`, no roman numerals, no asterism, no "Ex libris", no colophon,
  no drop shadows on type. Arabic numbers appear only where they count something real:
  chapter numbers in the contents and on About.
- **Section heads carry no label.** The h2 says what the section is; at most one link
  sits at its right.
- `text-wrap: balance` on display, titles and the footer blurb; `pretty` on paragraphs,
  captions, subtitles and card titles.
- Reading measure is 30–36em. Body text is never below 17px.
- **Rag.** The build binds every one- or two-letter word to the next word with a no-break
  space (`a`, `I`, `to`, `of`, `σε`, `το`, `να`…) in display, lead, caption and subtitle
  copy. A line never ends on "a" or "I".
- **Meta rows** ("9 chapters · 3 h 50 min") draw the dot with CSS (the `dots` utility).
  The dot is attached to the END of each item with a no-break space, so a separator can
  never start a line, and each item never breaks inside.
- **Figures.** Old-style proportional in reading text; lining tabular in UI, times and
  durations (`24:10`, `0:00`, `3 h 50 min`).
- **Case.** Chicago title case for book and chapter titles ("Faith, When the Doctors
  Said No"); sentence case for everything else, including story and video titles.
- **Greek:**
  - `lang="el"` on the root of /el, and `lang="en"` on any English inside Greek pages
    (the English edition title, English book titles in body copy);
  - quotes are «»;
  - decimal comma («4,9», «1,0×»);
  - units with no-break spaces («4 ώρ. 10 λεπ.», «6 λεπτά ανάγνωσης»);
  - `hyphens: manual`;
  - `overflow-wrap: break-word` on display text as a 320px safety net for long
    compounds such as «αντιμετωπίζεις».

---

## 4. Layout and spacing

### 4.1 One spacing scale

| Token | px | Tailwind step | Typical use |
|---|---|---|---|
| `--space-1` | 4 | 1 | icon to label, badge gaps |
| `--space-2` | 8 | 2 | label to field, row padding |
| `--space-3` | 12 | 3 | row padding, text gaps |
| `--space-4` | 16 | 4 | phone gutter, card padding on phones |
| `--space-5` | 24 | 6 | between related blocks |
| `--space-6` | 32 | 8 | grid gap, tablet gutter, card padding |
| `--space-7` | 48 | 12 | spread page padding, block to block |
| `--space-8` | 64 | 16 | section padding on phones, desktop gutter |
| `--space-9` | 96 | 24 | section top on desktop |
| `--space-10` | 128 | 32 | section bottom on desktop |

Tailwind keeps its 4px base (`--spacing: 4px`), so only steps 1, 2, 3, 4, 6, 8, 12, 16,
24 and 32 are allowed.

Layout tokens:
- `--grid-gap` 32;
- `--section-pt` / `--section-pb`: 64 / 64, then 96 / 128 from 1024;
- `--head-gap` (heading row to content): 32, then 64 from 1024.

**Sizes are not spacing**:
- `--size-control` 48 and `--size-control-sm` 44;
- `--size-row` 56;
- `--size-header` 64, 72 from 1024;
- `--size-play` 72.

### 4.2 The one grid

- **12 columns with 32px gaps from 1024px**; phones and tablets are one column, with
  two-column forms from 720.
- Gutter 16, then 32 from 720, then 64 from 1180. Content max is 1280 and the text
  column 720.
- Column x-origins at 1440 are 80, 189, 299, 408, 517, 627, 736, 845, 955, 1064, 1173
  and 1283. Every block snaps to one of them; there are no ad-hoc widths.
- Breakpoints:
  - `xs` 360: the header CTA appears;
  - `sm` 640: the language switch moves into the header;
  - `md` 720: two-column forms, dot leaders, story excerpts;
  - `lg` 1024: the grid and the open spread;
  - `xl` 1180: inline nav and the three-pane studio.
- `scroll-padding-top` is the header height plus 12px (`--space-3`), so a focused
  control's ring clears the header and its hairline. Sections take
  `scroll-margin-top: -12px`, so a section jumped to still meets the header flush. When
  the mini player is docked, `scroll-padding-bottom` is 80px, so focus and anchors are
  never hidden.

| Section (from 1024) | Placement |
|---|---|
| Hero | portrait 1–5, words 7–12 |
| Player head | h2 1–7, editions 8–12 |
| Spread | verso 2–5, recto 8–11 on the spread's own 12 columns; the fold is a hairline at 50% |
| Book | cover 1–5 (two rows), body 7–12, review 7–12 bottom-aligned with the cover |
| Free eBook card | copy 2–5, form 7–11 |
| Quote | 3–10 |
| Videos | feature 1–8, side column 9–12 |
| Foundation | photo 1–6, words 7–12 |
| Stories | lead text 1–5, lead image 7–12; rows: meta 1–3, text 4–10 |
| Footer | Letters copy 1–6, form 7–12; brand 1–5, nav 7–12; legal 1–6, 7–10, 11–12 |
| About hero | words 1–7, portrait 9–12 |
| About foreword | h2 1–5, text 7–12 |
| About chapters | label + title 1–4, text 5–11; photos and the pull quote 5–11 |
| About mission | 2–11 |
| About values | title 1–4, text 5–11 |
| About close | h2 1–6, actions 7–12 |

### 4.3 The three section backgrounds

| Utility | Light | Dark | Used for |
|---|---|---|---|
| `band-ivory` | warm-ivory | cocoa-night | hero, book, quote, videos, stories; About hero, chapters, mission, close |
| `band-peach` | peach-cream | cocoa-night + hairline top and bottom | the audiobook spread, foundation, footer; About foreword and values |

There is no dark band: the cocoa band was retired in 3.1 (a stored `"cocoa"` reads as
ivory). Band rules:
- two peach bands never touch;
- a band never changes inside a section.

### 4.4 Section rhythm

- `section-pad` gives `--section-pt` / `--section-pb`.
- The heading row (`.shead`) is the h2 on the left and at most one link on the right,
  then `--head-gap` to the content.
- Below 720 the link moves to the end of the section (`.foot-link`).
- There is no label above the h2 and no rule under it.

### 4.5 Home, in order

1. **Header** (sticky, global).
2. **Hero** (ivory).
3. **Audiobook, the open book** (peach). Pinned here in both languages.
4. **Book + Free eBook** (ivory).
5. **Quote** (ivory).
6. **Videos** (cocoa).
7. **Foundation** (peach).
8. **Stories** (ivory).
9. **Footer** (cocoa): Letters sign-up, links, legal.

### 4.6 About, in order

1. Hero, text-led (ivory).
2. Foreword (peach).
3. Chapters of her life, with two photos and one pull quote (ivory).
4. Mission (ivory).
5. Values (peach).
6. Close: "Start with chapter one." (ivory).
7. Footer, with the docked mini player.

---

## 5. Shape

- **Radius: 12px everywhere**: cards, buttons, inputs, badges, segmented groups, images,
  the spread, the eBook card, the studio preview frame. Tailwind's `rounded-xs` to
  `rounded-3xl` all resolve to 12px.
- **Circles** only for round controls (play, transport, the listen disc, play badges),
  dots and the switch thumb.
- **Small marks are square**: non-text marks under 40px (edition and mini-player covers,
  the checkbox), because 12px would turn them into pills.
- **Concentric nesting**: outer radius = 12 + gap (the studio swatch ring is 17 around a
  12px chip with a 5px gap).
- **Hairline**: 1px `--color-hairline` for rules and card edges. Interactive edges use
  `--color-field-border`.
- **Flat**: no shadows, gradients, glass or blur, with one exception: the sticky header
  (88% ivory or night, 14px backdrop blur). Tailwind's shadow, inset-shadow,
  drop-shadow, text-shadow and blur scales are removed from the theme.
- **The arch** is used on exactly two things: her portrait (home hero, About hero) and
  the book cover.
  - It is one arch, with no frame: `arch-wrap` sets `container-type: inline-size`, and
    the arch is `border-radius: 50cqi 50cqi 12px 12px` filled with `--color-surface-alt`
    (peach, or cocoa-ink in dark mode).
  - There is no hairline ring and no inner offset.
  - Portrait ratio 4:5. `crop-hero` removes the baked-in vertical lettering in
    `hero-portrait.jpg`.
  - The cover sits in an **arch niche**: the 3:4 cover is bottom-aligned at 76% width
    with 32px below it, so the curve frames the cover and never crops its type.
    `crop-cover` trims the photo to the printed face, without the spine shading.
- **The ribbon**: a 12×36 Tangerine bookmark tab with an 8px V-notch (clip-path), beside
  the current chapter row only. It is the only ornamental shape besides the arch.

---

## 6. Motion

Motion is rare and slow. The page is complete the moment it arrives.

- **No scroll-triggered reveals.** Nothing above or below the fold starts hidden, and
  nothing animates in as the reader scrolls. Content is the same for print, crawlers,
  screenshots and readers without JavaScript.
- **Hover** changes colour, background, border or underline (200ms). Nothing moves,
  scales or lifts.
- **Allowed**, and nothing else:
  - the menu, the phone sheet and the lightbox opening and closing;
  - the audio progress (the scrubber and the mini player's line, as state);
  - a thin Tangerine line at the top while a slow navigation loads.
- **Nothing loops and nothing autoplays.** No spinners, shimmer skeletons, marquees,
  carousels on a timer, pulsing dots or equalizer bars. Tailwind's `animate-*` scale is
  removed.
- Smooth scrolling only for jumps the reader starts (`html:focus-within`).
- **Reduced motion**: no smooth scroll, transitions at 0.01ms (this includes the switch
  knob and the Layout chevron). The scrubber and the mini-player progress line update as
  state, not animation.

---

## 7. Photography

**The photographs Joel supplied with the site** (`src/assets/`), used as on the original
site (Joel, 2026-10-23). The library is seeded from `scripts/content/media.ts`; Anastasia
can swap any of them in the studio. No illustration.

| Slot | File | Ratio | Notes |
|---|---|---|---|
| Home hero | `hero-portrait.jpg` | 4:5 arch | `crop-hero`; `fetchpriority="high"`; never reused elsewhere |
| Editions, mini player | `fyrts-cover.jpg`, `book-two.jpg` | 3:4 | 36px and 32px, square corners, `alt=""` (the title is the name) |
| Book | `fyrts-cover.jpg` | 3:4 in the arch niche | `crop-cover` |
| Videos, feature | `anastasia-book-desk.jpg` | 16:9 | object-position 50% 38% |
| Videos, up next | `gallery-speaking.jpg`, `gallery-ghana.jpg`, `pathway-work.jpg` | 16:9 at 96px | placeholders until the channel's own thumbnails are wired |
| Foundation | `pathway-purpose.jpg` | 3:2 | real alt; caption "Feeding hope, one heart at a time." |
| Gallery | ten photos: desk, speaking, Cyprus, portraits, behind the scenes, family, sunset, author table, quote, open book | masonry | |
| Stories | `blog-one.jpg`, `blog-two.jpg`, `blog-three.jpg` | 3:2 | one cover per starter post |
| About, chapter 09 | `fyrts-author.jpg` | 3:2 | "Author & founder" |
| Masterclass | `pathway-work.jpg` | 3:2 | cover |
| Lead story | `blog-three.jpg` | 3:2 | decorative duplicate of the linked title (`alt=""`, `aria-hidden`) |
| About hero | `portrait-two.jpg` | 4:5 arch | |
| About, after chapter 02 | `gallery-ghana.jpg` | 3:2 | caption "From Ghana to Cyprus — and everywhere in between." |
| About, after chapter 07 | `pathway-purpose.jpg` | 3:2 | hands holding the low sun |

- **Not used:** `gallery-community.jpg` (a crowd of strangers).
- **Four ratios only**: 4:5 portrait (arch), 3:4 book cover, 16:9 video, 3:2 story,
  Foundation and About.
- **Distinct frames.** On one page no two thumbnails repeat the same pose or scale, and
  the hero portrait is never a thumbnail.
- **Faces are never covered.** The video play badge sits bottom-left and the duration
  chip bottom-right. Text never sits on a photo.
- **Crops** are art-directed with the `crop` utility (`--crop-w/x/y`) to remove baked-in
  lettering and frame the cover face, never to zoom for drama.
- **Alt text.** Every content image has `width`, `height` and real alt text describing
  her and the moment ("Anastasia Patience, smiling, in a white blazer, her chin resting
  on her hand"). Decorative duplicates are `alt=""`.
- Images keep their colour in dark mode. No overlays, duotones or blur. Everything below
  the hero is lazy in production.

---

## 8. Iconography

- **One family**: 24px grid, 1.5px stroke, round caps and joins, `currentColor`, no
  fills (the dot is the only filled glyph).
- Sizes are 16, 20 and 24. The back-15 and forward-30 arcs are 36, with the numeral set
  inside in 12px sans.
- The set:
  - player: headphones, play, pause, prev, next, back, forward;
  - arrows and chevrons: arrow-right, arrow-up-right (external), arrow-up, arrow-down,
    chevrons;
  - general: check, lock, heart, book, menu, close, alert;
  - studio: grip, eye, eye-off, plus, minus, undo, redo, monitor, tablet, phone, copy,
    trash, pencil, clock, missing (dashed circle), more.
- Studio variant diagrams use the same 1.5 stroke on a 48×32 grid.
- An icon is always paired with a visible word or an accessible name. Decorative icons
  are `aria-hidden`.
- No emoji, no brand-logo icon rows, no three identical icon cards. Social links are
  words.

---

## 9. Components

### Button

| Variant | Rest | Hover | Use |
|---|---|---|---|
| Primary | Tangerine fill, Cocoa label (5.22) | Burnt fill, Ivory label (dark: Apricot, Cocoa) | one per view |
| Quiet | transparent, 1px field-border, text colour | peach background, text-colour border | secondary actions, header "Free eBook", buy rows |
| Text | underline in accent colour | accent colour, 2px underline | tertiary ("Keep as is", "Revert section") |

- **Sizing.** Heights 48 (`--size-control`) and 44 (`btn-sm`); padding 0 24 (0 16
  small); 15px/600 Noto Sans; icon 20 after the label (16 in small buttons).
- **States:**
  - Focus: a 2px focus ring with a 4px offset.
  - Disabled: tertiary text and a dashed border. Never lower the opacity of a Tangerine
    fill.
  - Loading: the label changes ("Sending your copy…"), with `aria-busy="true"` and the
    button disabled. No spinner.
- **Round controls:**
  - transport 48 (44 below 360px);
  - play 72 (64 below 360px);
  - mini-player play 48;
  - the hero listen disc 56.

  Primary round controls are Tangerine with a Cocoa glyph.

### Link

- Underline 1px in `--color-accent-text` with an offset of 0.3–0.45em. On hover the
  text turns accent and the underline goes to 2px. Visited is not styled.
- Standalone links (`.link`, 15px/600 sans, 44px tall) carry an arrow:
  - right for in-site links;
  - up-right for external links, with sr-only "(opens in a new tab)" or
    "(opens YouTube)".
- Below 720px, a heading-row link moves to the section foot.

### Header

- **Bar.** Sticky, 64 high (72 from 1024), the header glass and a hairline bottom border.
- **Wordmark.** "Anastasia Patience" in Source Serif at title size, weight 500, 44px tall
  target, linking home. It drops to 16px below 390px, so the wordmark, the Free eBook
  button and the menu fit on one row at every phone width.
- **Nav.** Inline from 1180: About, Books, Stories, Videos, Gallery, Foundation, Contact
  (15px/500 sans, text-secondary). The current page is in text colour with a 2px accent
  underline (`aria-current="page"`).
- **Header action.** "Free eBook" is a quiet button, so it never competes with the hero
  Listen:
  - shown from 360px, with its book icon from 640;
  - on /el below 420px it reads "eBook", with «Δωρεάν» kept for screen readers, so the
    accessible name stays «Δωρεάν eBook» and the button stays on one line;
  - below 360px it lives only in the menu.
- **Language switch.** In the header from 640px. Below 640, it moves to the menu panel.
- **Menu (below 1180):**
  - The button is 44px, with a static label "Menu" / «Μενού», plus `aria-expanded` and
    `aria-controls`.
  - The panel toggles the `hidden` attribute. It holds 56px serif rows for the nav,
    then the language row, then a full-width primary "Free eBook".
  - Escape closes the panel and returns focus to the button. Without JavaScript the
    panel is a `<details>` disclosure.
- **Skip link.** The first focusable element is "Skip to content" / «Μετάβαση στο
  περιεχόμενο», Tangerine with Cocoa text.

### Language switch

- **Header.** Two real links, `EN / ΕΛ`, each 44×44, with `hreflang` and `lang` set.
  - Visible text is the short code; the accessible name is the full name
    (`<span aria-hidden="true">ΕΛ</span><span class="sr-only">Ελληνικά</span>`).
  - The current one has `aria-current="page"` and a 2px accent underline.
- **Menu.** A two-cell row of 56px links, "English | Ελληνικά". The current one takes the
  selected style and a check.
- **Same page, other language.** It always goes to the same page in the other language
  (`/about` ↔ `/el/about`), never to home. On /el, every internal link, including the
  header CTA, points to the Greek page (`/el#free-ebook`, `/el/about`).
- A link to English-only content on /el carries `hreflang="en"` and the visible note
  «(στα Αγγλικά)».
- Every page carries `<link rel="alternate" hreflang>` for both editions.

### Hero

- **Desktop:**
  - The portrait arch is on columns 1–5 and starts under the header.
  - Columns 7–12 hold, left-aligned:
    - the h1 (max 11ch; 12ch in Greek);
    - the lead (at most 3 lines at 1440 in English);
    - the actions;
    - at the bottom, aligned with the portrait's base, the caption "A daughter of
      Ghana, a woman of Cyprus, a mother by miracle, and a storyteller by calling."
- **Listen action.** A 56px Tangerine disc with a two-line label. It is one link, with
  no outer box.
  - Label: "Listen to the audiobook" (15px/600), with a 13px meta line under it.
  - **The meta line depends on state** and always matches the player:
    - first visit: "Starts at chapter 1 · read by me" / «Από το κεφάλαιο 1 · με τη φωνή
      μου»;
    - returning listener: "Resume chapter 5 · 18 min left" / «Συνέχισε από το κεφάλαιο
      5 · 18 λεπ. ακόμη».
  - Pressing it scrolls to `#listen` and moves focus to Play. It never starts audio.
- **Secondary action.** "Read my story", a text link to About.
- **Phones.** Order: portrait (max 264px), h1, lead, Listen, "Read my story", then the
  caption last, so the h1 is reached early.
- At 1440×900 the hero ends near 764px, so the player's editions show above the fold.

### Audiobook player: the open book

`<section id="listen">` on `band-peach`.

**Head row (from 1024).**
- The h2 "Listen, in my own voice." / «Άκουσε, με τη δική μου φωνή.» on columns 1–7.
- The editions on 8–12. On phones the editions follow the h2.

**Editions.** A native radio group, so arrow keys work without script:
`<fieldset class="editions"><legend class="sr-only">Choose an audiobook</legend>`.
- Each edition is a 56px hairline-ruled row: a 36px 3:4 square-cornered cover, the title
  (Source Serif 16/600), the meta ("9 chapters · 3 h 50 min"), and a check.
- No inner borders and no fills.
- Selected shows as text colour plus the check; unselected rows are text-secondary.
- The focus ring is drawn on the row with `:has(input:focus-visible)`.
- **On /el**, the Greek edition is first and selected:
  - «Βρες τον λόγο σου να χαμογελάς», «Ελληνική έκδοση · 9 κεφάλαια · 4 ώρ. 10 λεπ.»;
  - then `<span lang="en">Turning Pain into Purpose</span>`, «Αγγλική έκδοση ·
    6 κεφάλαια · 2 ώρ. 46 λεπ.».
- A returning listener's selected edition reads "Chapter 5 · 2 h 06 min left".

**The spread.**
- One hairline card on `--color-surface` with a 12px radius, named by
  `role="region" aria-label="Audiobook player"` / «Πρόγραμμα αναπαραγωγής ηχητικού
  βιβλίου».
- From 1024 it uses its own 12 columns: verso on 2–5, recto on 8–11, and the fold a 1px
  hairline at exactly 50%.
- Below 1024 the verso stacks over the recto with a hairline between.

**Verso (the left page).**

1. **Page head.**
   - Headphones icon plus the status: "Ready to listen" / «Έτοιμο για ακρόαση», then
     "Paused" / «Σε παύση», or "Playing".
   - At the right, the speed button: 44px, field-border, visible "1×", with sr-only
     "Playback speed ". It cycles 0.75×, 1×, 1.25×, 1.5×, 2× («1,25×» in Greek). There is
     no aria-label, so the visible text is the name.
2. **Chapter.** "Chapter 1 of 9" (meta), then the chapter title as an h3 in the title
   role.
3. **The opening line**: the chapter's first sentence in Display M (Noto Serif Display,
   28–36px, roman, balanced). For example: "My mother taught me the power of prayer and
   how to stay resilient through life's difficulties." This is the signature: her
   words, set large, beside her voice.
4. **Scrubber.**
   - A native `<input type="range">` (opacity 0) fills a **44px-tall** hit area over a
     3px `--color-track` track.
   - The accent fill and a 20px accent thumb carry a 4px surface ring.
   - `aria-valuetext` reads "0:00 of 24:10" / «0:00 από 26:02» and updates during
     playback.
   - Keys: ← and → seek 5s; PageUp and PageDown seek 30s.
   - The focus ring is drawn on the wrapper via `:has(input:focus-visible)`.
   - The elapsed and total times below are `aria-hidden`, because the valuetext carries
     them.
5. **Transport.**
   - Previous chapter (disabled on chapter 1), back 15, play/pause (72, Tangerine),
     forward 30, next chapter.
   - Every button is labelled, and play/pause swaps its label between Play and Pause.
     It has no `aria-pressed`.
6. **Announcements.** One sr-only `role="status"`, updated only when the chapter or
   edition changes: "Now playing chapter 6 of 9, The Pregnancy".

**Recto (the contents page).** A `<section aria-labelledby>` headed by the h3 "Contents"
and the meta line "Read by the author". It is not a `<nav>`.

- **Rows.** An `<ol>` of `<button type="button" class="toc-row">` rows, 56px high.
- **Inside each row:**
  - the number hangs at the title's first line (tabular, tertiary);
  - the title is Source Serif at body size;
  - from 720 a 2px dotted leader in `--color-leader` runs from the end of the title's
    **last** line to the duration, so a wrapped title never strands its dots;
  - the duration is tabular and tertiary.
- **Screen-reader text.** Each row reads "Play chapter 5: My Biggest Question to God, 30
  minutes 55 seconds". The visible duration is `aria-hidden`.
- **Current chapter:**
  - `aria-current="true"` plus sr-only ", current chapter";
  - title at 600 weight, number and duration in accent;
  - the **ribbon tab** (12×36, Tangerine, V-notch) in the margin beside the row.

  No italic. On a first visit the current chapter is chapter 1.
- **Played chapters** (returning listener) show a 16px check before the duration in
  tertiary, with sr-only ", played".
- **Phones and tablets** show a window of four chapters around the current one, plus
  "Show all 9 chapters" (`aria-expanded`, `aria-controls` on the list). From 1024 all
  nine show.

**Progress is shown two ways only**: the scrubber (this chapter) and the played ticks
(the book). There is no segmented book bar and no full-height ribbon.

**Behaviour.**
- It never autoplays and loads paused.
- Position, chapter, edition and speed persist per edition and resume.
- The Media Session API fills the lock screen.
- There are no global Space or arrow shortcuts.
- The keyboard order is: edition, speed, scrubber, previous, back 15, play, forward 30,
  next, chapters.

**Mini player.**
- **When it appears.** Only after playback has started in this session and the spread
  has scrolled out of view.
- **Placement.** Docked full width at the bottom of the viewport: `position: sticky;
  bottom: 0`, placed after the footer. At the end of the page it comes to rest below the
  legal row and never covers it.
- **Surface.** A solid `--color-bg` background with a 1px hairline top. A 2px accent
  progress line along its top edge shows chapter progress. It pads for the safe area.
- **Contents** (one 56px row): a 32px square-cornered 3:4 cover, "Chapter 1 · 3:12 /
  24:10" with the title (ellipsis), back 15, play/pause (48, Tangerine), and "Open the
  player" (chevron-up link to `#listen`).
- `html:has(.mini-player)` sets `scroll-padding-bottom: 80px`, so a focused field or
  link is never hidden under it (WCAG 2.4.11).

### Book

- **Desktop:**
  - The cover in the arch niche is on columns 1–5, spanning two rows.
  - Columns 7–12 hold:
    - the h2 "Find Your Reason to Smile";
    - the subtitle in lead size: "A Journey of Faith, Loss, Resilience, and Hope";
    - the rating meta "Memoir · 4.9 · 480+ reviews" / «Απομνημόνευμα · 4,9 · 480+
      κριτικές»;
    - the description, the formats and "All books".
  - The review sits under them on columns 7–12, aligned to the cover's bottom.
- **Phones (reading order = DOM order).** Cover, title and subtitle, rating, description,
  formats, All books, then the review. A quote never comes before the book it praises.
- **Formats.** Hairline rows, 56px, on a two-column grid whose rows are subgrids.
  - Each row has the name (Source Serif body/600) over where to buy (meta) on the left,
    and a quiet small button on the right.
  - Every button shares the widest button's width (minimum 184px), so the left edges
    align in both languages.
  - The rows are Paperback "Buy on Amazon ↗", eBook "Get the eBook ↗", and Audiobook
    "Listen above ↑" (to `#listen`).
- **Review.** The real quote, word for word, in lead-size roman text with a hairline
  above:
  - EN: "I read this in one sitting and cried the good kind of tears. It felt like a long
    letter from a wise older sister." The credit is "Ama, Accra" (meta).
  - Greek: «Το διάβασα μονορούφι και έκλαψα — από εκείνα τα καλά δάκρυα. Ήταν σαν ένα
    μακρύ γράμμα από μια σοφή μεγαλύτερη αδελφή.» The credit is «Άμα, Άκρα».
  - Reader quotes are never paraphrased.

### Free eBook form

`id="free-ebook"`. A peach card (`surface-alt`) with a hairline and 12px radius, 64px
under the book. From 1024 it sits on the page grid: copy on 2–5, form on 7–11.

- **Copy.** The h3 (Display M) "Read it tonight, free." / «Διάβασέ το απόψε, δωρεάν.»,
  then "Leave your first name and email and Find Your Reason to Smile is yours to
  download straight away."
- **Hint** above the fields, referenced by both inputs: "Both fields are needed to send
  your copy." / «Χρειάζονται και τα δύο για να σου στείλω το αντίτυπο.»
- **Fields.** First name (`autocomplete="given-name"`) and Email
  (`autocomplete="email"`), side by side from 720 at 1 : 1.4.
  - Both `required`, with labels above and **no placeholders**.
  - Each has an error slot linked with `aria-describedby`.
- **Opt-in.** An unchecked 24px checkbox on a 44px row: "Also send me Anastasia's letters
  (one a week, unsubscribe any time)".
- **Submit.** "Send me the free eBook" (primary, full width).
- **Fine print.** A lock icon, "We use your email only to send the book and, if you ask,
  the letters.", and "Privacy policy" (a 44px link).

| State | What changes |
|---|---|
| Error | On submit, then on blur. Each invalid field gets `aria-invalid="true"` and its message is unhidden (Berry, alert icon, 8.19 on peach). Messages: "Add your first name so I know who it's for." / «Γράψε το μικρό σου όνομα.»; "Enter an email like name@example.com." / «Γράψε ένα email όπως name@example.com.» Focus moves to the first invalid field and typed values stay. |
| Sending | The button reads "Sending your copy…" / «Στέλνω το αντίτυπό σου…», disabled, `aria-busy`; fields keep their values. |
| Success | The form is replaced in place. The h3 `tabindex="-1"` takes focus: "It's yours, Ama." / «Είναι δικό σου, Άμα.» Then "Your download is ready below. We have also emailed you the link." and two quiet buttons, "Download PDF" and "Download EPUB". The text is mirrored into a `role="status"` region. |
| Server error | An inline Berry message above the button: "Something went wrong on our side. Your details are still here — please try again." |
| Offline | "You're offline. Your details are saved here; send when you're back." The button stays enabled and retries. |

The footer Letters form uses the same pattern. On cocoa, errors are Blush at 10.11.

### Quote

- An ivory band with no label and no ornament. On desktop the figure sits on columns
  3–10 under a hairline.
- One sentence in Display L, roman, Cocoa, centred and balanced: "No matter what you're
  facing, your reason to smile still exists."
- The source is a `<cite>` caption: *Find Your Reason to Smile*.
- It is a plain `<section>` with no `aria-label`, so it adds no landmark.

### Videos

`band-ivory`, `#videos`.

- **Heading row.** The h2 "On stage, on camera." / «Στη σκηνή, στην κάμερα.» and the link
  "YouTube channel ↗", which opens YouTube.
- **Desktop:**
  - The 16:9 feature is on columns 1–8: 12px radius, a 64px Tangerine play badge
    bottom-left, and a duration chip bottom-right (peach on cocoa, 12px/600).
  - The side column (9–12) is spaced to end with the frame:
    - "Latest · 8:42";
    - the h3 in Display M, "Inside Find Your Reason to Smile";
    - one line, "Why I wrote it, and the chapter I almost left out.";
    - then **Up next**: three rows, each a 96px 16:9 thumbnail, a serif title
      (`pretty`) and the duration.
  - There is no separate strip of four.
- **Phones.** Frame, caption, Up next, then the channel link at the foot.
- **Accessible names:**
  - Feature link: "Play video on YouTube: Inside Find Your Reason to Smile, 8:42".
  - Up-next rows: the title, then sr-only ", 11 minutes 5 seconds, on YouTube (opens
    YouTube)". Durations are `aria-hidden`.
- **Data.** Titles, durations and thumbnails in the mock are placeholders. The live
  section reads them from the channel (newest first). Every video has approved EN and EL
  captions, embedded with `cc_load_policy=1`, plus `hl=el` on /el.

### Foundation

- `band-peach`, `#foundation`.
- **Photo (columns 1–6).** `gallery-community.jpg` (3:2) with the caption "Feeding hope,
  one heart at a time."
- **Words (columns 7–12).**
  - The h2 "Where no one feels left behind.";
  - the lead (food assistance, compassionate care, community outreach, care for rescued
    animals);
  - one owner line: "Each case is a person — not a number. Stories shared with care and
    permission.";
  - actions: **Donate** (primary, heart), "Volunteer" and "Impact stories" (links).
- When the owner supplies it, the owner line becomes one concrete case (who was helped,
  and where). The full programme list lives on /foundation, not here.

### Stories

- `band-ivory`, `#stories`.
- **Heading row.** "Stories from the honest middle." and "All stories".
- **One lead story:**
  - text on columns 1–5: category label (Meta 600, accent, as written: "Purpose &
    Faith"), then the h3 title in Display L ("Faith, when the doctors say no"), the
    excerpt, the meta "February 14, 2026 · 7 min read" and "Read the story";
  - image on columns 7–12: a 3:2 photo.
- **Two more stories as text rows:** meta on 1–3 (category, date, read time), and on
  4–10 the title (h3) with an excerpt from 720.
- **Browse by theme.** A `<nav aria-label="Browse by theme">` of five 44px links.

### Footer

`band-peach` with a hairline top rule, a plain `<footer>` with no `aria-labelledby`.

- **Letters (top).** The h2 "Letters on faith and building a life you love." with "One
  letter a week, from my desk in Cyprus to your inbox." on 1–6. The form on 7–12 has:
  - the "Your email" label;
  - the field and **Subscribe** (primary) inline;
  - fine print "Unsubscribe anytime." with a Privacy policy link.
- **Links.**
  - The brand on 1–5: wordmark, then "Author, storyteller, entrepreneur. Founder of
    Patience Media House." (balanced).
  - Then **one** `<nav aria-label="Footer">` on 7–12 with three columns, Explore /
    Company / Follow, each headed by an h3 in Meta 600 (no capitals).
  - Phones: two columns, with Follow as one inline row (YouTube, Instagram, Facebook,
    TikTok).
- **Legal row.** "© 2026 Anastasia Patience. All rights reserved." on 1–6. On 7–10, a
  `<ul aria-label="Legal">` of Privacy, Terms and Cookies, each 44px tall with a 16px
  gap. "Based in Cyprus" on 11–12.
- There is no colophon.

### About

- **Hero (text-led).**
  - The h1 "A life rewritten in the margins." (roman) and the lead on columns 1–7.
  - A facts list (`<dl>`, three columns from 720, hairline-ruled):
    - Based in: Cyprus;
    - Continents that raised me: Africa & Europe;
    - Founder of: Patience Media House.
  - The `portrait-two.jpg` arch on 9–12, aligned to the bottom.
- **Foreword (peach).**
  - The h2 "Every scar is a syllabus." on 1–5, and three paragraphs on 7–12.
  - The first paragraph opens with a drop cap: Noto Serif Display in accent,
    `initial-letter: 3` (fallback: floated at 4.75em) with 0.06em inline-end margin, so
    "My" still reads as one word.
  - The h2 is not repeated in the text.
- **Chapters (ivory).** The h2 "Every season taught me something." and "Read the book".
  - Nine hairline rows: label and title stacked on 1–4 (number in accent, label in
    meta, h3 title), the text on 5–11.
  - Between rows, on 5–11:
    - the Ghana photo after 02, with its caption;
    - the pull quote after 06, "I chose faith. I chose him." (Display L, roman);
    - the `pathway-purpose.jpg` photo after 07.
- **Mission.**
  - One sentence in Display L, roman, balanced, with no dash and no forced break: "To
    hand every woman a lantern for the dark seasons, and a map to build a life she loves
    once the light returns."
  - Caption "My mission". Columns 2–11.
- **Values (peach).** The h2 "Five values, one calling." and five hairline rows (title on
  1–4, line on 5–11). No numerals.
- **Close.** The h2 "Start with chapter one." on 1–6. On 7–12: "Listen to the first
  chapter" (primary, headphones, to `/#listen`) and "Get the free eBook".
- **Each line appears once.** Chapter 09 owns "Find Your Reason to Smile is my letter to
  every woman…". No CTA heading or footer repeats it.

### Form fields

- **Field.** The label above (15px/600 sans in the studio; Meta 600 on the site), a
  48-high field, 1px field-border, 12px radius, surface fill, 16px text and 16px inner
  padding.
- **No placeholders.** Labels and hints carry the meaning.
- **States:**
  - Hover: a text-secondary border.
  - Focus: a text-colour border plus the 2px focus outline with a 2px offset.
  - Invalid: `aria-invalid="true"` and the message below with the alert icon, linked by
    `aria-describedby`.
- **Helper text.** Meta, linked by `aria-describedby`.
- **Checkbox.** 24px square. Checked takes the selected fill with an on-selected tick.
  The whole label row (44px) is the target. Consent boxes are unchecked by default.
- **Other controls.** The switch (`role="switch"`, 44×24 track, the whole row is the
  label), segmented control (a fieldset of radios with a legend) and stepper (44px
  buttons) follow the same border, selected and focus rules.

### Badges (translation status)

Always icon + word. Each badge is 24px high with a 12px radius, 12px/600 sans and a 14px
icon. A count may follow ("Stale 1"). When a badge is a link, `::before` extends its hit
area to 44px tall. Linked badges carry sr-only "Greek: ".

| Status | Fill | Text | Edge | Icon | Meaning |
|---|---|---|---|---|---|
| Approved | surface | text-secondary | hairline | check | Greek reviewed and live. The quietest: not shown in section rows at all |
| Draft | bg-alt | text | dashed field-border | pencil | Greek written, not approved |
| Stale | Apricot | Cocoa · 8.55 | none | clock | English changed after the Greek was approved |
| Missing | Blush | Berry · 6.07 | none | dashed circle | No Greek yet; /el shows the English with `lang="en"` |
| Hidden | transparent | text-secondary | field-border | eye-off | Section hidden in both languages (studio rows only) |

Stale and Missing keep their colours in dark mode.

### Save state and status messages

- **No toasts.**
- The studio top bar carries the save state next to the Draft pill:
  - "Saving…";
  - "Saved just now", then "Saved 2 min ago";
  - offline: "Saved on this device".
- Undo is a permanent top-bar button ("Undo heading change"), so recovery never depends
  on a timed message.
- Each change is also announced once through an sr-only `role="status"`, for example
  "Gallery hidden in English and Greek".

### Empty, loading, error and offline states

- **Empty.** Say what is missing and offer the next step in her voice.
  - Stories filter: "No stories in Wellness & Lifestyle yet. Start with Purpose &
    Faith →".
  - Studio page: "This page has no sections yet." + "Add the first section".
  - Never a blank area or a sad illustration.
- **Loading.**
  - Space is reserved at the final size: aspect-ratio boxes in bg-alt for images and
    video.
  - Text appears only after 400ms ("Loading chapters…"). No spinners, no shimmer.
  - Audio buffering shows "Buffering…" in the status slot, and Pause appears only once
    audio actually plays.
- **Error.** Inline Berry text with the alert icon, saying what happened and what to do:
  "This chapter didn't load. Try again".
  - If YouTube fails, the video section shows stored thumbnails linking to YouTube.
  - Never a raw error code.
- **Offline.**
  - A quiet bar under the header (bg-alt, hairline, alert icon): "You're offline.
    Chapters you've played are saved on this device."
  - Forms keep their values.
  - In the studio, Publish is disabled with "Reconnect to publish", and edits keep
    saving locally.

---

## 10. Studio

The page builder edits Home in place. It is the same system: same tokens, type, badges,
controls and selected style.

### Desktop (from 1180px): three panes under one top bar

**Top bar** (72, header glass), left to right:

1. **Identity.** Wordmark | divider | breadcrumb "Studio / Home". The crumbs are 44px
   targets.
2. **State.** The "Draft" pill (peach, hairline, accent dot) and "Saved just now". From
   1180 to 1439 the wordmark, divider and "Saved just now" step aside; the breadcrumb and
   the pill stay.
3. **Editing language.** EN | ΕΛ, a segmented fieldset with legend "Editing language".
4. **Greek status.** "Greek **5/9** approved" (shown at every width), then the badge
   links Stale 1, Missing 1 and Draft 2, each jumping to its row.
5. **History.** Undo, and Redo (disabled when empty).
6. **Preview.** A quiet button that opens the draft in a new tab.
7. **Publish.** "Publish · 4 changes" (primary, `aria-haspopup="dialog"`). Below 720 it
   reads "Publish · 4", with "changes" kept for screen readers.

**Sections pane** (312, left).
- The h2 "Sections" with "Home · 10 sections · 1 hidden".
- **Rows** are 56px. Each has three parts:
  - A grip button, 44 wide, `aria-label="Move Videos"`, described by the keyboard help.
    Locked rows show a lock icon (sr "Fixed position.") instead.
  - A row button: name + meta, with the Greek badge only when not Approved.
    `aria-current="true"` marks the selected row.
  - An eye button, 44, with the stable label "Hide {section}" and `aria-pressed`
    (pressed = hidden).
- **Sections** have plain names: Header (Global, locked), Hero, Audiobook player ("Pinned
  below the hero", locked), Book, Quote, Videos, Foundation, Stories, Gallery, Footer
  (Global, locked).
- **Selected**: the selected fill with on-selected text and icons. The focus ring inside
  it flips to on-selected.
- **Hidden**: name and meta in text-tertiary, an eye-off icon in text-tertiary, and the
  Hidden badge. Never struck through, never orange.
- **Add section** (quiet, full width).
- **Legend:**
  - "Greek translation" with Approved 5 · Draft 2 · Stale 1 · Missing 1;
  - "A missing section shows the English text on /el until its Greek version is
    approved."

**Canvas** (fluid, peach).
- **Bar.** "Live preview" with "English · draft". The label switches to `<span
  lang="el">Ελληνικά</span> · draft` with the editing language. Then the device
  segmented control (Desktop 1440 / Tablet 768 / Phone 390, icons with sr names) and
  "Fit · 50%".
- **The preview** is the real page in an `<iframe inert tabindex="-1">` at the emulated
  width, scaled: `transform: scale(frame width / emulated width)`.
  - It is not in the tab order and takes no clicks. Keyboard users select sections from
    the Sections list. Interactive testing happens in Preview.
  - A wheel over the frame scrolls the preview.
- **Geometry comes from the page, never guessed.** Inside a frame, the site posts
  `{type: "ap:layout", height, sections: [{id, top, height}]}` on load (after fonts) and
  on resize.
  - The studio sets `--frame-h`, `--sec-top`, `--sec-h` and `--off` (the section top
    minus a 112px lead on desktop, 16px on phones).
  - It scrolls the selected section into view.
- **Selection:**
  - A 2px accent outline on the section.
  - **Outside** the section, above its top-right corner, sits a bar with:
    - the tag "Videos · Filmstrip" (accent fill, `--color-bg` text: Ivory on Burnt 4.99,
      Night on Apricot 10.35);
    - the tools Move up, Move down, Duplicate, Hide | Delete (Berry). These are plain
      buttons, not `role="toolbar"`.
  - "Add section below" is centred on the section's bottom edge.
  - None of these ever covers the section's own content.

**Inspector** (360, right).
- **Head.** "Section 6 of 10" and the h2 "Videos", with More actions.
- **Order:**
  1. **Stale alert** (only when present): the Stale badge and "Greek needs review".
     - A diff:
       - Was: ~~On stage, on camera, on purpose.~~
       - Now: **On stage, on camera.**
       - Greek: «Στη σκηνή, στην κάμερα, με σκοπό.» (`lang="el"`).
     - Actions: "Review Greek" (quiet) and "Keep as is" (text).
  2. **Content** (a fieldset, first, because it is what the owner edits most):
     - Heading, with the counter "20 of 60 characters" linked by `aria-describedby`. It
       is not a live region; the status region speaks only at 10 left and at the limit.
     - Link text.
     - **No `*stars*` italic syntax.** Headings are plain text.
  3. **Source** (a fieldset):
     - The channel card "YouTube channel · @AnastasiaPatience · newest first ·
       Connected".
     - The "Videos shown" stepper (44px buttons), set to 4.
     - The switch row "Link to the channel". The whole row is the label (44px) and it is
       described by "Shows the link text beside the heading."
  4. **Layout** (a `<details>`, open by default, collapsible):
     - Variant tiles: Grid, Masonry (disabled and dashed, "Masonry is for the Gallery
       only."), Carousel, and Filmstrip (feature plus up-next diagram).
     - Width: Text 720 / Wide 1280 / Edge to edge.
     - Spacing: Compact 64·64 / Regular 96·128 / Generous 128·128, with the values shown
       ("96 top · 128 bottom on desktop"). Phones are always 64·64.
     - Background: three swatches, Warm ivory, Peach cream and Cocoa ink. These are the
       three band utilities and nothing else.
  5. **Footer**: "Visible in English and Greek" and "Revert section".

**One selected style in the inspector.**
- Tiles and segments: the selected fill with on-selected text. A focused selected
  segment flips its ring to on-selected.
- Swatches show selection as a 2px text-colour **ring** 3px clear of the chip (concentric
  radius 17), plus a **tick** inside the chip, plus the name at 600. Focus is a separate
  2px focus-colour outline outside the ring, so selection and focus never look alike.

**Publish confirmation.** A `<dialog>` opened with `showModal()`. Focus moves inside, and
the backdrop is cocoa-ink-52.
- Title: "Publish 4 changes to Home?"
- "They go live on the site straight away. English and Greek publish together."
- The list of changes: Videos, heading edited; Gallery, hidden; Book, buy links
  reordered; Footer, legal links edited.
- The Greek note: "Greek: Videos is stale and Stories is missing. Until they are
  approved, /el shows the English text for them."
- Actions: Cancel (quiet) and Publish now (primary).
- Publishing never blocks on Greek.

### Phones and tablets (below 1180)

One column, fully usable at 320px.

1. **App bar.**
   - Back ("All pages"), then "Home" with "● Draft · Saved just now".
   - Undo, and **Publish · 4**.
   - A second row: EN | ΕΛ and "Greek 5/9 approved". A third row: the badges (they
     wrap).
2. **Canvas bar.** "Live preview · English · draft" and "Open ↗".
3. **Section picker.** Previous ("Previous section: Quote"), the button "Section 6 of 10 ·
   Videos · Stale", then Next. The middle button opens the **Sections sheet**:
   - full screen, `role="dialog"`, `aria-modal="true"`, labelled by "Sections";
   - the top bar, canvas and inspector become `inert`;
   - Escape or Close returns focus to the picker.
   - A top-bar badge opens the sheet and focuses its row. On desktop a badge focuses the
     row directly.
4. **Preview.** The phone preview (390 emulated, scaled to fit) with the selection
   outline.
5. **Actions.** An action row of 56px targets: Up, Down, Duplicate, Hide, Delete. Then
   "Add section below".
6. **Inspector.** In the same order as desktop.

### Editing behaviour

- **Saving.** Autosave on every change. Undo and redo with Ctrl/Cmd+Z and Shift+Z. The
  save state is in the top bar.
- **Reorder without dragging** (WCAG 2.5.7). The grip is a button; announcements go
  through an `aria-live="assertive"` region:
  - Space picks up: "Videos picked up, position 6 of 10".
  - ↑ and ↓ move: "Moved to position 5 of 10".
  - Space drops: "Dropped at position 5".
  - Escape cancels: "Move cancelled".

  The selection tools and the phone action row offer Move up and Move down as well.
- **Hide.** It toggles `aria-pressed` on a stable "Hide {section}" label and announces
  "{Section} hidden in English and Greek".
- **Locked sections** cannot be moved, hidden or deleted.
- **Delete** asks for confirmation with the section name, and Undo restores it.
- A skip link "Skip to section settings" jumps to the inspector.

---

## 11. Translation workflow

- English is the source. Each section's Greek has a status: **Missing → Draft →
  Approved**. It becomes **Stale** when its English changes after approval.
- The top bar always shows "Greek N/9 approved" plus the problem badges. The Sections
  legend shows all four counts.
- Switching the editing language to ΕΛ shows the Greek fields with the English source
  above each one. The preview switches to /el, and its label switches language
  (`lang="el"`).
- A Stale section opens with the Was / Now / Greek diff at the top of the inspector.
- Missing sections render the English on /el (marked `lang="en"`) until approved.
- Publishing never blocks on Greek; the Publish dialog names the Stale and Missing
  sections.

---

## 12. Accessibility

Target: WCAG 2.2 AA everywhere, public site and studio.

- **Contrast.** See 2.4. Every text pair is 4.5 or higher. Every control boundary, track
  and focus ring is 3:1 or higher. Hairlines are decorative only.
- **Focus.**
  - Always visible: a 2px `--color-focus` outline with a 4px offset (2px on fields).
  - On selected fills it flips to `--color-on-selected`.
  - Never removed, never colour-only, never the same as the selected state.
- **Targets.** 44×44 minimum, 48 for primary actions. This covers:
  - language links, the wordmark, menu, speed and the scrubber (44 tall);
  - chapter rows (56), legal and privacy links, theme links, the opt-in row;
  - studio crumbs, grip, eye, badge links (`::before`), the switch row, stepper buttons.
- **Structure:**
  - One h1 per page, and on every page the headings run h1 → h2 → h3.
  - The studio has an sr-only h1 "Studio: editing Home".
  - Site landmarks: `header`, `nav "Primary"`, `main`, `footer` (unnamed, holding one
    `nav "Footer"`), plus "Browse by theme". The player is `region "Audiobook player"`.
  - The contents list is a `section`, not a `nav`. The quote section adds no landmark,
    and there are no `aside` notes on About.
  - Studio landmarks: `header`, `main` wrapping all three panes, `aside` (Sections),
    `section "Live preview"`, and `section` (inspector).
- **Language.**
  - `lang` on `<html>`, `lang` and `hreflang` on language links, and `lang="en"` on
    English inside Greek pages and vice versa.
  - /el links stay on /el pages. `hreflang` alternates on every page.
- **Player.**
  - The editions are a native radio group, and chapter rows are buttons with a verb and
    a spoken duration.
  - The range has `aria-valuetext`. Play/pause labels track state and the speed button
    shows its visible text.
  - There is one polite status for chapter changes.
  - No autoplay: the player loads paused. Chapter text exists for every audio chapter.
- **Forms.**
  - Real labels and a stated requirement (the hint), with `autocomplete`.
  - Errors are linked by `aria-describedby`. Focus moves to the first error, or to the
    success heading.
  - Success is visible and mirrored to `role="status"`.
- **Studio.**
  - The preview is `inert`. The phone sheet is a modal dialog with the rest inert.
  - Publish confirms in a modal `<dialog>`.
  - Reorder is announced and has button alternatives. Hide toggles use one pattern
    (stable label + `aria-pressed`).
  - The character counter is not a live region.
- **Forced colours (Windows High Contrast).** These keep a system colour with
  `forced-color-adjust: none`:
  - selected segments, tiles, rows, the checkbox and the menu language row: Highlight /
    HighlightText;
  - the scrubber fill and thumb: Highlight, on a CanvasText track;
  - the ribbon tab: Highlight;
  - the selected edition and the swatch ring: a Highlight outline or border;
  - badges: a CanvasText border.
- **Colour is never the only signal.**
  - Badges have icon + word.
  - The current chapter has weight, accent, the ribbon and `aria-current`.
  - The selected edition has a check.
  - Hidden rows have an eye-off icon and a Hidden badge.
- **Motion.** `prefers-reduced-motion` is respected. Nothing loops or autoplays.
- **Reflow.**
  - Verified with no horizontal scroll on every page and the studio, in both languages,
    at 320, 340, 360, 375, 389, 390, 414, 768, 1024, 1180, 1280 and 1440.
  - At 320, the language switch and the Free eBook action stay reachable through the
    menu.
  - Type is in rem, so 200% zoom scales it fully.

---

## 13. Copy and language

- **Voice.** Her voice: first person, warm, plain. "Read my story", never "Learn more".
- **Names.**
  - **Stories** (not Blog).
  - The newsletter is **Letters**.
  - The gated download is **Free eBook**.
  - Studio sections use plain names (Hero, Quote, Footer), not typesetter jargon.
- **Hero.** EN "Turning pain / into *purpose.*"; EL «Μετατρέπω τον πόνο σε *σκοπό.*».
- **"Purpose" in display copy** appears only in the home h1. Elsewhere it appears only as
  part of a proper name (the book *Turning Pain into Purpose*, the category "Purpose &
  Faith", the About value).
- **Headings** come from her own lines:
  - Videos "On stage, on camera."
  - Stories "Stories from the honest middle." / «Ιστορίες από το ειλικρινές ενδιάμεσο.»
  - Letters "Letters on faith and building a life you love."
- **Reader quotes and owner facts are quoted word for word.** Placeholder data (video
  titles and durations) is marked as such in the spec and replaced by live data.
- **Greek is written, not machine-translated.** Every layout is checked with the Greek
  string: the nav at 1180, buttons, the header CTA at 390, `display-xl-el` and
  `display-l-el`.
- **Times and dates.** "3 h 50 min", "24:10"; Greek «4 ώρ. 10 λεπ.» with no-break
  spaces. Dates: "March 12, 2026" / «12 Μαρτίου 2026».

---

## 14. Anti-slop checklist

Ship nothing that fails one of these.

**Colour**
- [ ] Only palette hexes and the named tints appear in CSS. No `#fff`, `#000` or stock
      Tailwind colours (the theme removes them).
- [ ] No orange text other than Burnt orange (Apricot on dark). No white or peach on
      Tangerine. Nothing from the "Never" list in 2.4.
- [ ] Exactly one Tangerine fill at rest per view.
- [ ] One selected style (Cocoa fill, Ivory text). The focus ring is never the selection
      cue.
- [ ] Every public page is bright (ivory and peach) whatever the system theme; the
      opt-in dark mode is cocoa (#1F120C / #3B1F14), never black, never grey.

**Type**
- [ ] Noto Serif Display only at 28px and up; three families total; type in rem + vw.
- [ ] **One italic on the site**: the hope word of the home h1.
- [ ] No tracked capitals, no uppercase transforms, no `§`, no roman numerals, no
      asterisms, no "Ex libris", no colophon.
- [ ] No label above a heading that repeats it; section heads are h2 + at most one link.

**Layout and shape**
- [ ] Every block snaps to the 12-column grid. No ad-hoc widths, no near-miss x-origins.
- [ ] Every size from the one type scale; every gap from the one spacing scale.
- [ ] Every radius is 12px (circles only for round controls); no pills except 24px
      badges.
- [ ] No shadows, gradients, glass or blur except the header.
- [ ] The arch only on her portrait and the book cover, as one fill with no frame.

**Motion**
- [ ] No scroll reveals; hover changes colour or underline only; nothing loops or
      autoplays; the player loads paused.

**Photography**
- [ ] Joel's supplied photos (`scripts/content/media.ts`) in 4:5, 3:4, 16:9 or 3:2.
- [ ] No reused hero portrait, no faces under badges.

**Icons**
- [ ] One icon family (24px, 1.5 stroke); no emoji; no row of three identical icon
      cards.
- [ ] No gradient blobs, decorative patterns, kente stripes or floating shapes.

**Copy**
- [ ] No lorem ipsum, no "Learn more", no filler stats.
- [ ] Copy comes from `en.ts`, `el.ts` and `site.ts`, and quotes are verbatim.
- [ ] The hero Listen line matches the player's state.

**Structure and language**
- [ ] The audiobook spread sits directly under the hero, in both languages.
- [ ] Greek tested at full length:
  - [ ] /el shows Greek UI, the Greek edition first, «» quotes, decimal commas and
        no-break spaces in units;
  - [ ] /el links stay in Greek.
- [ ] Meta separators are CSS dots that never start a line; no line ends on a one- or
      two-letter word in display copy.
- [ ] 320px: no horizontal scroll and no lost function.
- [ ] Visible focus everywhere; targets 44px or larger.
- [ ] No token names from the old theme: every name says what it is
      (`--color-tangerine`, `--color-text`, `--color-track`, `--color-selected`).

---

## 15. Implementation notes

- **Where the tokens live.** `src/styles.css` imports, in order:
  - `styles/fonts.css`: the three variable families, Latin and Greek subsets;
  - `styles/tokens.css`: the palette, named tints, semantic tokens for light and
    opt-in dark, the type scale, spacing, sizes, radius and motion, plus the Tailwind
    theme mapping;
  - `styles/base.css`: element defaults, type roles, bands, buttons, links and the
    utilities below;
  - `styles/site.css`: the header, footer, hero, player, book and the other signature
    components, one partial per area in `styles/site/` (`chrome`, `hero`, `player`,
    `book`);
  - `styles/sections.css`: every other page-builder section, the forms and the item
    pages, one partial per area in `styles/sections/` (`text`, `collections`, `forms`,
    `items`).
- **Guards.** `src/styles/style-rules.test.ts` fails the build on hex colours outside the
  palette, capitals or tracked labels, shadows, gradients, blur outside the header,
  italic outside the type layer, reveals, and eyebrows, numerals or `caps()` in public
  components.
- **Theme.** Light always; `<html class="dark">` is the only way into dark mode.
- **Utilities:** `band-ivory`, `band-peach`, `grid-12`, `section-pad`,
  `shead`, `foot-link`, `card-hairline`, `dots`, `arch-wrap`, `arch`, `arch-niche`,
  `crop`, `crop-hero`, `crop-cover`, `header-glass`.
- **Production class names** used by the base layer:
  - `.mini-player`;
  - `.ribbon-tab` beside the current chapter row;
  - `.scrub-track`, `.scrub-fill`, `.scrub-thumb`, `.badge`.
- **Rag helper.** The `nb()` text helper binds one- and two-letter words to the next
  word with U+00A0 in display, lead, caption and subtitle strings. Durations and units are
  joined with U+00A0 at the source.
- **Pages beyond the mocks.** Books, Stories (the journal), the shop, masterclasses,
  events, the foundation and its stories, and the private utility pages (download,
  confirm, unsubscribe, receipt, 404) use the same section heads, rows, cards, fields and
  states. A collection item's page opens with its own intro (the h1, the facts, the
  one action) on the 12-column grid, then its sections. On phones a book page keeps a
  slim buy bar at the bottom once its formats have scrolled away.
