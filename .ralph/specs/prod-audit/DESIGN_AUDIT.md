# Production design / UX audit

**Owner:** design-lead  
**Date:** 2026-08-24  
**Dev:** http://127.0.0.1:8081/  
**Scope:** public EN (+ EL spot) visual/UX/broken UI; admin shell without credentials

---

## Method

1. Browser smoke every main public route (H1 + load)
2. Book detail CTA inventory
3. Auth/admin redirect path
4. Code review shop/empty/hash, Reveal, book buy cluster
5. Cross-check fullstack `FINDINGS.md` / glue

---

## Public pages — status

| Route                              | Load      | UX / visual                  | Issues                                                                                   |
| ---------------------------------- | --------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| `/`                                | OK        | Strong after P2.1            | Reveal mid-fade residual → **fixed** in `Reveal.tsx` this pass                           |
| `/books`                           | OK        | Editorial H1                 | Continue P2.3 polish later                                                               |
| `/books/find-your-reason-to-smile` | OK        | P2.2 largely landed          | Buy fallback “Get the free guide” works when Amazon null; sticky compact present in code |
| `/gallery`                         | OK        | Seeded images                | Lightbox/craft still P2.4 if desired                                                     |
| `/shop`                            | OK        | Empty-safe cards             | “Soon” non-link cards OK; filter chips need focus-visible                                |
| `/blog`                            | OK        | Letters list                 | Related/OG polish = suggestion                                                           |
| `/contact`                         | OK        | Form present                 | Trust copy / privacy link missing                                                        |
| `/start`                           | OK        | Link-in-bio bare chrome      | Intentional bare; brand OK                                                               |
| `/masterclasses`                   | OK        | Landing                      | Enroll CTA depends on CMS URLs                                                           |
| `/about`                           | OK        | Story                        | —                                                                                        |
| `/auth`                            | OK        | Sign-in studio               | No public signup CTA — OK if invite-only                                                 |
| `/admin`                           | → auth    | Loading then `/auth`         | Full CRUD smoke needs **@user credentials**                                              |
| `/unsubscribe`                     | OK        | Invalid token state designed | Valid token path needs E2E with real token                                               |
| `/el`                              | OK        | Greek H1 wraps               | Spot-check long titles on book/shop                                                      |
| 404                                | OK (HTTP) | —                            | Visual 404 polish optional                                                               |

**Broken images (sample pages):** 0  
**Dead `href="#"` in shop source:** none (glue fixed)

---

## Admin (without login)

| Check                    | Result                                          |
| ------------------------ | ----------------------------------------------- |
| Unauthenticated `/admin` | Redirects to `/auth`                            |
| Auth UI                  | Email/password, “Private area” — usable         |
| Deep CRUD                | **Blocked** — need admin credentials from @user |
| Chrome on admin          | Bare (public header hidden) — correct           |

**When credentials available, FE should smoke:** books, blog, gallery, products, pages, socials, newsletter, messages, image upload, Greek panel, mobile drawer.

---

## Design fixes shipped this pass

1. **`src/components/Reveal.tsx`** — less “empty gray” mid-fade: higher initial opacity (0.35), shorter 0.45s, earlier viewport trigger, delay capped 0.12s. Reduced-motion still static.

---

## Open design/UX defects (hand to FE / others)

| Sev     | Item                                                                        | Owner                    |
| ------- | --------------------------------------------------------------------------- | ------------------------ |
| P1      | Shop filter chips + product cards lack gold **focus-visible**               | @frontend-lead           |
| P1      | Privacy / cookie page missing if newsletter is marketing email              | @fullstack + design copy |
| P1      | Book Amazon/ebook URLs empty in CMS — commerce incomplete                   | content + admin          |
| P2      | Gallery lightbox / captions craft                                           | design P2.4 → FE         |
| P2      | Books index elevation (P2.3)                                                | design → FE              |
| P2      | Coral CTA body contrast 3.22:1 — large text only; avoid coral text on coral | known DESIGN.md          |
| P3      | Image weight / blur placeholders                                            | @perf-guardian P3        |
| Blocker | Prod domain / absolute OG                                                   | @user + @it-orchestrator |
| Blocker | Admin E2E credentials                                                       | @user                    |
| Process | `AGENTS.md` Lovable banner — protected; **@user** clear manually            | @user                    |

---

## Lovable (design surface)

- No Lovable strings in `src/` UI components found this pass.
- Infra strip already done per orch `FINDINGS.md`.
- Residual: **AGENTS.md** banner only (user action).
- Browser title horse emoji seen in harness is **not** in `__root` title meta — harness artifact, not site brand.

---

## Feature suggestions (design lens)

Add to product backlog (see also `SUGGESTIONS.md`):

1. **Press / speaking one-pager** — PDF + branded kit page
2. **Testimonial CMS** beyond book reviews — home quote band editable
3. **Book formats badges** (Paperback / eBook / Audio) on detail
4. **Reading progress** on blog posts
5. **Share cards** (native share + copy link) on book + blog
6. **Empty-state illustration** optional brand photo not sad stock
7. **Admin “preview public”** per entity (open `/books/slug` in new tab from card)
8. **Focus mode** for TipTap (distraction-free)

---

## Production-ready (design bar)

**Not yet “fully prod ready”** until:

1. Domain + absolute SEO/OG
2. Admin authenticated smoke green
3. Purchase URLs or intentional fallback UX signed off
4. Privacy page if email list is live marketing
5. P3 media pass for LCP
6. Remaining public elevation optional for beauty, not for “works”

**Works today (public):** main IA pages render, EN/EL home, book fallback CTA, forms present, gallery/shop seeded, no blank critical paths found in smoke.

---

## Next

- @frontend-lead — shop focus rings + admin interactive smoke when creds land
- @design-lead — P2.2 formal accept if FE confirms gate; then P2.3 books index
- @user — admin login + domain + AGENTS.md clear
