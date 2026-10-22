# Fullstack glue audit notes — 2026-08-24

## Verified working

- Contact insert (service role + anon RLS path) → `contact_messages`
- Newsletter subscribe insert → `subscribers` with auto `unsubscribe_token`
- Unsubscribe API `POST /api/public/unsubscribe` with real token → `{ok:true}`
- Books CMS: 2 published + reviews; create/update/delete ACL via `has_role`
- Masterclass row present
- Blog posts: 3 rows

## Fixed this pass

- **Gallery empty** — seeded 5 sections + 6 images (`/public/gallery/*`) + migration
- **Shop empty + `#` checkout bug** — seeded bridge product to FYRTS book; shop cards no longer use `href="#"`; internal vs external links handled
- **hreflang** on contact/gallery/shop EN routes
- **bunfig.toml** — removed Lovable package allowlist residue
- AGENTS.md Lovable banner still present — **write blocked**; @user must clear manually

## Still blocked for “fully prod ready”

1. Prod domain / absolute SITE_URL (OG/robots)
2. Admin interactive UI smoke (needs login credentials)
3. Git remote for CI
4. Gallery/shop images are large static PNG/JPG — P3 compress
5. No transactional email on contact/subscribe (data lands in Supabase only)
6. Amazon/ebook purchase URLs still null on books

## Ralph

Already initialized (`ralph.yml` + `PROMPT.md` prod-audit). Re-init not required.
