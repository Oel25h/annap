# Phase 2.1 — Home screenshot accept

**Status:** **ACCEPTED** (2026-08-24)  
**Reviewer:** design-lead  
**Evidence:** live `http://127.0.0.1:8081/` + FE shots `anastasia-p2-home/` + code review `src/routes/index.tsx`

## Musts

| Must                     | Verdict                                                                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Counter 0-flash          | **Pass** — `useState(to)` first paint; settled 18,000+ / 2 / 120,000+ / 4. (In-view tween still dips through mid values — intentional craft, not broken zeros.) |
| Book stage + detail CTA  | **Pass** — bone→ivory stage, soft-shadow, primary → FYRTS detail                                                                                                |
| focus-visible gold rings | **Pass** — shared `focusRing` on CTAs/cards                                                                                                                     |
| reduced-motion           | **Pass** — parallax + scroll cue gated                                                                                                                          |
| rounded-3xl craft        | **Pass**                                                                                                                                                        |
| letters clamp + empty    | **Pass** (code)                                                                                                                                                 |
| email focus              | **Pass** — banded form polished                                                                                                                                 |

## Residuals (non-blocking → later polish)

1. **Offer bento Reveal** — screenshots can catch books tile at mid-opacity gray; prefer stronger initial opacity or shorter fade so fold never looks “empty.”
2. **Counter tween** — optional: animate from ~85%→100% instead of 0→100% to avoid any 0-ish frames while strip is on-screen.
3. P3 images still heavy.

## Next

**P2.2** book detail spec → @frontend-lead (`BOOK_DETAIL_SPEC.md`).
