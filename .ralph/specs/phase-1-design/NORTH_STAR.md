# Phase 1 — Public visual north-star

**Owner:** design-lead  
**Status:** direction locked — **no public implementation until Phase 2**  
**Handoff:** page-by-page specs + screenshot accept with @frontend-lead

## Target feeling (one line)

**“Literary luxury memoir studio”** — warm cream paper, coral as heartbeat, cinematic portraiture, calm confidence. Advanced = restraint + craft + speed, not more decoration.

## What “advanced beautiful” means here

| Pillar    | Yes                                                 | No                                                      |
| --------- | --------------------------------------------------- | ------------------------------------------------------- |
| Hierarchy | One clear hero idea per fold; display type breathes | Competing H1s, badge spam                               |
| Color     | Ivory field, bone cards, single coral CTA           | Rainbow gradients, cool gray SaaS                       |
| Type      | Grotesk display + DM body; coral accent phrases     | Random third fonts, faux handwriting overload           |
| Motion    | Scroll reveal, subtle parallax, 200–400ms ease      | Bounce, infinite spam, ignoring reduced-motion          |
| Imagery   | Full-bleed portrait, book-as-object, generous crop  | Tiny stretched stock, heavy unoptimized PNG as “design” |
| Density   | Magazine whitespace                                 | Card grids crammed edge-to-edge                         |
| Trust     | Designed empty/loading/error                        | Blank CMS holes, layout jump                            |

## Reference bars (taste anchors — not clones)

Use as **quality bar** for craft, not layout Xerox:

1. **Aesop.com** — material calm, disciplined type, commerce without shoutiness.
2. **The Marginalian (Brain Pickings)** — literary intimacy, long-form respect.
3. **Kinfolk** — cream editorial, photography-led pacing.
4. **Monocle** — crisp nav, international magazine IA, confident small caps.
5. **Stripe Press** (press.stripe.com) — book-as-artifact presentation, premium detail pages.

**Local differentiators vs refs:** Ghana × Cyprus warmth, faith/purpose voice, coral (not black-only), kente-adjacent whisper patterns, bilingual EN/EL.

## System already in codebase (preserve)

- Cream/coral token set + pill CTAs
- `Eyebrow`, `Reveal`, `PatternDivider`, Explore nav
- Star-italic CMS headlines → `font-italic-display`
- Locale switcher + skip link

P2 **elevates** these; it does not replace the brand.

## Phase 2 page priority (suggested sequence)

| Order | Surface                                | Elevation focus                                                                      |
| ----: | -------------------------------------- | ------------------------------------------------------------------------------------ |
|     1 | Home                                   | Hero hierarchy, proof strip, book feature, letters grid rhythm, email capture polish |
|     2 | Book detail (FYRTS)                    | Cinematic cover treatment, sticky buy cluster, quote/pull, reviews                   |
|     3 | Books index                            | Collection editorial, empty state already OK — refine cards                          |
|     4 | Gallery                                | Magazine grid + lightbox craft, captions                                             |
|     5 | Blog index + post                      | Reading measure, category chips, related                                             |
|     6 | Masterclasses / Shop / Contact / Start | Convert clarity, form focus, trust                                                   |
|     7 | Global chrome                          | Header scrolled state, footer IA, mobile nav polish                                  |
|     — | EL twins                               | Same components; type overflow + meta only                                           |

Each page: **spec → implement → screenshot EN (+ EL spot check) → accept** before next.

## Motion budget (P2)

- Page load: no multi-second choreography.
- Scroll: `Reveal` once; stagger ≤ 80ms.
- Hero parallax: subtle (existing transform ranges OK); disable under reduced-motion.
- Hover: 200–300ms, max −2px lift on CTAs.

## States (designed, all public lists)

| State       | Pattern                                                                              |
| ----------- | ------------------------------------------------------------------------------------ |
| Loading     | Bone pulse skeletons matching card geometry                                          |
| Empty       | Centered card, calm line, optional CTA (no sad-illustration kitsch unless brand art) |
| Error       | Soft destructive text + retry; never raw exception                                   |
| Partial CMS | Fall back per `CONTENT_SOURCE.md` without layout collapse                            |

## Explicit non-goals (until asked)

- Dark mode
- Full redesign of admin (quiet studio only)
- New illustration system
- Animation-led “awwwards” overload
- Token mass-rename (`plum`/`burgundy` identifiers)

## P1 deliverable boundary

This north-star + `DESIGN.md` + token/button maps **complete design’s Phase 1**.  
Public pixels change in **Phase 2** only after @tech-lead opens that phase.
