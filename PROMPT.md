# Active Ralph task — Full production audit + fix

Project: Anastasia Heartfelt Journey  
Path: `/Users/oel25h/Documents/Anastasia-Heartfelt-Journey`

## Goal

Make the site **fully production-ready**: audit every public + admin surface, fix breakage, keep Lovable fully removed, document missing/new features.

## Scope

1. Public EN: `/` `/about` `/books` `/books/find-your-reason-to-smile` `/blog` `/blog/*` `/gallery` `/masterclasses` `/shop` `/start` `/contact` `/auth` `/unsubscribe` + 404
2. Public EL twins under `/el/*`
3. Admin: `/admin` and every sidebar page (books, blog, gallery, products, pages, masterclass, newsletter, messages, subscribers, socials, start)
4. Forms: contact, email capture, newsletter unsubscribe
5. Auth gate + server ACL on mutations
6. SEO: titles, robots, sitemap, absolute OG when SITE_URL set
7. `bun run gate` must stay green

## Process

- Work one route family at a time; write findings to `.ralph/specs/prod-audit/FINDINGS.md`
- Fix bugs immediately when safe; note larger features under SUGGESTIONS.md
- Prefer CMS/data fixes over hardcoding
- Do not reintroduce Lovable packages or branding

## Done when

- FINDINGS.md lists every checked route with pass/fail + fix
- Critical fails fixed
- SUGGESTIONS.md has prioritized feature ideas
- `bun run gate` green
- Output exactly: `LOOP_COMPLETE`
