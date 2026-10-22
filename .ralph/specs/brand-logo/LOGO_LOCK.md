# Logo lock — Anastasia Patience monogram

**Asset:** gold script monogram (AP interlocking) on transparent / black master  
**Live files:** `/logo-ap-mark.png` (header/footer), favicon set, `site.webmanifest`  
**Live check:** https://www.anastasiapatience.com — cream header reads correctly

## Usage

| Context | Spec |
|---------|------|
| Header | Mark ~32–36px tall + wordmark “Anastasia Patience” (display, charcoal) |
| Footer | Mark ~40px + wordmark |
| Favicon / PWA | Gold on dark (master) — OK; small sizes stay monogram-only |
| On cream/ivory/bone | Use **transparent mark** (gold metal) — never put black square behind |
| On plum/dark | Same gold mark OK |
| Clear space | ≥ 0.25× mark height on all sides |
| Don’t | Recolor to coral; stretch; add drop shadow competing with soft-shadow system |

## Token note

Photographic **logo gold** ≠ UI token `--gold` (`#f4a582` peach). Keep both: monogram is brand metal; UI gold is soft accent/ring.

## Design pass (this turn)

- Accepted mark on cream next to wordmark  
- Removed mobile-only “A·P” text duplicate beside monogram (full name always)  
- Decorative `alt=""` OK when wordmark visible; parent has `aria-label` home  

## Optional later

- SVG vector mark for crisp 1x/2x  
- OG image with monogram + portrait  
- Admin Studio mark parity  
