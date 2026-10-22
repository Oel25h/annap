# Phase 2.1 — Home elevation (frontend)

**Owner:** frontend-lead  
**Status:** implemented · awaiting @design-lead screenshot accept  
**Gate:** `bun run gate` GREEN

## Spec

`.ralph/specs/phase-2-home/HOME_SPEC.md`

## Shipped

| Must                                 | Done                                                                                            |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Counter 0-flash                      | Final value first paint; RAF tween only in-view; reduced-motion = final                         |
| Featured book stage + detail CTA     | Bone/ivory stage + soft-shadow-lg; primary → `/books/find-your-reason-to-smile` when slug known |
| focus-visible CTAs/cards             | Gold ring stack on hero/bento/book/letters                                                      |
| reduced-motion parallax + scroll cue | `useReducedMotion` gates y-transforms + bounce                                                  |
| rounded-3xl craft                    | Portrait, who photo, offer tiles, letter cards                                                  |
| Letters line-clamp + empty           | `line-clamp-3`; empty CMS → calm “New letters soon”                                             |
| Email focus                          | Banded input ring + labeled + submit focus                                                      |

## Paths

- `src/routes/index.tsx` (shared with EL twin)
- `src/components/EmailCapture.tsx`

## Screenshots

Workspace: agent workspace `anastasia-p2-home/` (01-hero … 06-letters). Spot-check live: http://localhost:8081/

## Residual

- No WebP/CDN (P3)
- Book detail only wired for FYRTS slug (other slugs → `/books`)
- Design accept → then P2.2 book detail
