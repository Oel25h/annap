# Phase D — Image compress (@perf-guardian)

**Date:** 2026-08-24  
**Status:** Done locally + deploy requested  

## What changed

| Asset | Before | After |
|-------|--------|-------|
| `fyrts-cover` PNG | ~1.5MB | **~187KB** JPEG |
| `fyrts-cover-3d` PNG | ~1.5MB | **~187KB** JPEG |
| `anastasia-book-desk` PNG | ~1.8MB | **~177KB** JPEG |
| `fyrts-author.jpg` | ~1.8MB | **~185KB** |
| `fyrts-quote.jpg` | ~1.0MB | **~109KB** |
| `hero-portrait.jpg` | ~256KB | **~160KB** |

Originals backed up under `.ralph/specs/phase-d-media/backups/`.

## Code

- Imports → `.jpg` on home, book detail, about, `media.ts`
- Legacy `.png` basenames still map in `resolveMediaUrl`
- CMS book `cover_url` patched → `/fyrts-cover.jpg`
- Seed migrations updated for new installs
- `public/` covers match

## Build evidence (Vercel output)

Largest static images now **≤ ~187KB** (was multi-MB PNGs).  
`typecheck` 0 · `secrets:check` PASS · `NITRO_PRESET=vercel` build OK.

## Residual

- No AVIF/srcset pipeline yet (future)
- TipTap/admin JS chunks still large (admin-only)
- CDN beyond Vercel edge not added
