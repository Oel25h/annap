# Suggested features / upgrades (not blockers)

Prioritized for Anastasia Patience personal brand + CMS.

## P0 — trust & ops (ship quality)

1. **Real domain + email** — custom domain on Netlify; transactional email (Resend/Postmark) for contact + newsletter confirm
2. **Double opt-in newsletter** + GDPR/privacy page (EL+EN)
3. **Sentry (or similar)** wired to `reportClientError` + server logs
4. **Git + CI** — restore repo; GitHub Action running `bun run gate` on PR
5. **Admin 2FA / invite-only signup** — lock down `/auth` (no public self-serve if not intended)
6. **Backup runbook** — Supabase dump schedule + Netlify rollback note

## P1 — content & growth

1. **Blog SEO** — per-post OG images, reading time from CMS, related posts
2. **Book commerce polish** — Amazon/ebook deep links required fields; “Also available as” badges
3. **Masterclass waitlist** with calendar ICS + reminder email
4. **Press / speaking kit** page (one-pager PDF download)
5. **Testimonials CMS** (not only book reviews)
6. **Search** on blog (client Fuse or Supabase full-text)

## P2 — experience

1. **Image pipeline** — WebP/AVIF, blur placeholders, Supabase Storage CDN
2. **Cookie consent** if analytics added
3. **PWA light** — install prompt optional; offline 404 already exists
4. **Greek translation QA queue** — admin “needs review” flag on Gemini drafts
5. **Analytics** — privacy-friendly (Plausible/Umami) with events on email + book CTAs

## P3 — stretch

1. Live shop checkout (Stripe/Paystack) if products leave “link out”
2. Members area / course drip
3. Podcast embed hub
4. Multi-author roles

## Explicitly out of scope unless requested

Dark mode, mobile app, multi-tenant white-label.
