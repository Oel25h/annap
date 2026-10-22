# Slice B — Admin E2E (frontend)

**Owner:** frontend-lead  
**Live:** https://anastasia-heartfelt-journey.vercel.app  
**Status:** pass (with fix shipped)

## Verified on live
- Sign-in → `/admin` dashboard (counts: 3 posts, 6 gallery, 1 shop, messages)
- Nav shells: books, blog, gallery, products, socials, messages, pages, start — all render, no empty crash
- Books: Add/Save/Greek panel present; Save click OK
- Messages: Mark read control present
- **Greek draft:** was **failing** (model 404) → fixed → **“Greek draft generated — please proofread.”**

## Fix shipped
- Default + env `GEMINI_TRANSLATE_MODEL` → `gemini-3.6-flash` (old `gemini-2.0-flash` retired)
- Code: `src/lib/translate.functions.ts`
- Vercel prod/preview/dev env updated; **prod redeployed**

## Residual / @user
- Change temp admin password after login (creds file local only — not committed)
- Fill Amazon/ebook URLs in admin when ready
- Mark-read toast/state polish optional; public still 200

## Not done here
- Full matrix every CRUD delete (avoid destructive data wipe in audit)
- Custom domain
