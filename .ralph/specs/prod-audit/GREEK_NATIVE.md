# Greek native locale pass — fullstack

**Domain seen:** `anastasiapatience.com` / `www.anastasiapatience.com` (Vercel alias live)

## Cause of “Greek not proper”
1. Public page chrome (books/shop/gallery/contact/masterclasses) was **hardcoded English** even on `/el/*`
2. CMS had almost **no approved** `content_translations` (only 1 draft)

## Fixed
- Expanded `en.ts` / `el.ts` with `books|shop|gallery|contact|masterclasses|start`
- Wired those routes to `useT()`
- Gemini batch → **approved** EL overlays: 2 books, 3 posts, 1 masterclass, 1 product, 5 gallery images
- Deployed production (aliased to www)

## Residual
- FYRTS **detail** route still has long static EN chapters (not CMS) — P2 content migrate or full EL message set
- Start page CMS link labels may still be EN until admin translates start_links
- `@it-orchestrator`: pin `SITE_URL`/`VITE_SITE_URL` to `https://www.anastasiapatience.com` + Supabase auth redirect allowlist
- Proofread Gemini Greek in Studio (approve already set for launch)

## Verify
- https://www.anastasiapatience.com/el/books
- https://www.anastasiapatience.com/el
- Locale switcher EN↔EL
