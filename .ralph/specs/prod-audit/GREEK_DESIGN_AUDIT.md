# Greek native — design live audit (www.anastasiapatience.com)

**Date:** 2026-08-24  
**Owner:** design-lead  

## Verified OK (chrome + H1 Greek)

| Path | Nav EL | H1 Greek |
|------|--------|----------|
| `/el` | Αρχική… Ξεκίνα εδώ | Μετατρέπω τον πόνο σε σκοπό |
| `/el/books` | OK | Βιβλία που σε φέρνουν σπίτι |
| `/el/shop` | OK | Εργαλεία για το γίγνεσθαι |
| `/el/gallery` | OK | Μια ζωή σε κεφάλαια |
| `/el/contact` | OK | Διαβάζω κάθε επιστολή |
| `/el/about` | OK | Μια ζωή ξαναγραμμένη… |
| `/el/blog` | OK | Επιστολές… |
| `/el/masterclasses` | OK | Greek H1 |
| Overflow | none on sample | |

## Residuals (not native yet)

| Sev | Surface | Issue | Owner |
|-----|---------|-------|--------|
| **P0** | `/el/books/find-your-reason-to-smile` | Full page still EN (title, chapters, CTAs “ALL BOOKS”, “MEMOIR”…) | @fullstack / @frontend-lead — wire CMS/i18n or EL static strings |
| **P0** | `/el/start` | Bare link-in-bio still EN CMS copy (“FIND YOUR REASON…”, “Get My Free Guide”) | CMS EL overlays for start_page_* + @fullstack |
| **P1** | Skip link | Was hardcoded EN | **Fixed** design → `t.common.skipToContent` |
| **P1** | Nav Explore item | `Masterclasses` loanword in EL | **Fixed** → `Σεμινάρια` |
| **P2** | Titles | Some `<title>` still mix EN book names | FE head() EL |
| **P2** | Proofread | Gemini approved copy may need human polish in Studio | @user |

## Type / layout

- No horizontal overflow on EL samples.  
- Long Greek H1s wrap acceptably; keep `break-words` on book detail when EL lands.  
- Caps tracking 0.22–0.28em is tight for Greek all-caps — optional future: slightly looser tracking for `el` only.

## Accept bar for “native Greek”

1. Every public `/el/*` route: chrome + body + CTAs Greek (proper nouns OK).  
2. FYRTS detail + Start fully EL.  
3. Skip link + aria labels localized.  
4. Human proofread pass in Studio for public-facing Gemini strings.
