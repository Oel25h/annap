# Foundation page — design elevation

**Public:** `/foundation` + `/el/foundation`  
**CMS:** `/admin/foundation` (unchanged contract)  
**Bar:** literary foundation / cause storytelling — Kinfolk calm + memoir warmth

## Shipped (design → code)

`src/routes/foundation.tsx`

- Hero: pattern whisper, bone slab behind portrait stage, `rounded-3xl`, focus rings on CTAs  
- Empty hero: kente whisper + heart + caption (not flat pink box only)  
- Mission / vision: asymmetric 7/5 — display mission + ivory vision card  
- Stories: featured first larger; alternating features; gold hairline; empty state craft  
- Closing plum band CTA before email capture  
- Tokens only; no new palette  

## Admin note (@user)

Upload a **hero image** in Studio → Foundation settings for max impact (placeholder is temporary).  
Featured story = first cinematic feature block.

## FE / deploy

@frontend-lead or @it-orchestrator: `bun run gate` + prod deploy.  
EL twin re-exports same component — no layout fork.
