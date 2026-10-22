# Redo brief: Anastasia Patience

Source of truth for the redo, written 2026-10-22 and revised the same day after a four-angle review (coverage, security, feasibility, author experience). It sits alongside `DESIGN.md` (the look), `src/styles.css` (the tokens), `supabase/migrations/` and `src/integrations/supabase/types.ts` (the data), and `docs/redo/current-state.md` (a map of the site before the redo). If a request conflicts with this brief, follow the request and update the brief in the same change.

## 1. What we are making

A mature, minimal, beautiful personal site for Anastasia Patience: author of *Find Your Reason to Smile*, storyteller, founder of Patience Media House and the Patience Humanitarian Foundation. Memoir-luxury, faith-rooted, shaped by Ghana and Cyprus. English and Greek, equally first-class.

The bar, in Joel's words: imagine Apple and a top UI/UX designer making this together. Advanced but simple, orange as the accent, real wow factor, nothing that looks like a template or generated filler. When Joel opens it, it is finished and every feature works.

The redo happens in place. Keep the stack (TanStack Start, React 19, Vite, Tailwind 4, Radix, Supabase, TipTap), the existing Supabase project and its data, the security model and the Greek review workflow. Rebuild the experience, the content model and the studio around them.

## 2. Decisions already made

| Decision | Source |
|---|---|
| Whole redo: every public page and the whole studio, all working end to end | Joel, 2026-10-22 |
| Reuse the existing Supabase project (`extyqqkasmchctvoltbm`) and its data; never create a new project | Joel |
| Host on Cloudflare Workers, not Vercel | Joel |
| Stripe, YouTube, Resend and Gemini credentials are entered in the studio, not in code or chat | Joel |
| Audiobook player directly below the home hero; many audiobooks, managed in the studio; the Greek site plays Greek audio | Joel |
| The ebook is downloaded free behind a short name-and-email form | Joel |
| Instant language switching that keeps you on the same page | Joel |
| Rebuild in place rather than start a new codebase: the plumbing works, the design and the hard-coded pages are what is wrong | Claude |
| Claude has full authority to decide inside this brief; ask only for things only Joel or Anastasia can provide | Joel |
| Greek approved before the redo without a named reviewer goes back to Draft until a person approves it | Owner rule: never publish unreviewed machine translation |
| No masterclass checkout or capacity tracking; masterclasses link out or to a shop product, with a waitlist form | Claude (scope nobody asked for) |
| No cart: "Buy now" goes straight to Stripe Checkout | Claude |
| Monthly donations are kept, with the full subscription lifecycle and a self-serve cancel link | Claude |

## 3. Architecture

### 3.1 Hosting and configuration

- Nitro `cloudflare-module` preset; `wrangler.jsonc` is merged into the generated worker config. `bun run build:cf` builds, `bun run preview:cf` runs the build under workerd locally. Workers Paid plan (10 ms CPU on Free is not enough for SSR), with `limits.cpu_ms` as a safety cap and Smart Placement on.
- **One build for every environment.** Public configuration (Supabase URL, publishable key, site URL) is read from the worker's environment at request time and handed to the browser in an inline script, never baked in with `import.meta.env`. No `VITE_*` reads in app code; the gate fails if one appears.
- Worker secrets: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (an `sb_secret_` key; the legacy service-role JWT is disabled after launch), `SITE_URL`, `APP_ENCRYPTION_KEY`, and `ADMIN_SETUP_SECRET` (local and preview only; never set in production once an admin exists). Third-party keys live in the studio (3.6).
- Test-only overrides `STRIPE_API_BASE`, `RESEND_API_BASE`, `GEMINI_API_BASE`, `YOUTUBE_API_BASE` are honoured only when `SITE_URL` is localhost or 127.0.0.1; the worker refuses to start with them otherwise, and the secrets check fails a deploy that sets them.
- Scheduled work runs from Cron Triggers declared through Nitro `scheduledTasks`: every 5 minutes drain `email_outbox` (exponential backoff, 6 attempts, then failed and shown on the dashboard); hourly YouTube sync; daily `purge_expired()` and removal of uploads never confirmed. Anything that needs Cloudflare `env` or `waitUntil` goes through `src/lib/cf.server.ts`.
- **Deploys only come from a green gate.** GitHub Actions runs `bun run gate` on every push (Supabase CLI, `supabase start`, `db reset`, stripe-mock, Playwright). On `main` it deploys the gate's own `.output` with `wrangler deploy`; other branches upload a preview version. Workers Builds stays disconnected.
- **Environments.** Local development and the gate use the local Supabase stack (`supabase start`), built from the migrations and `supabase/seed.sql`. Production data is never used for development or tests. Previews run as a separate worker (`anastasia-patience-preview`, an `env.preview` block) behind Cloudflare Access with its own secrets, pointed at a Supabase preview branch of `extyqqkasmchctvoltbm` when branching is available. Until then, phase exits are shown on the local workerd build and recorded with screenshots. The production worker sets `workers_dev: false` and `preview_urls: false`. No preview ever holds production keys.
- `supabase/config.toml` mirrors production auth: signup off, anonymous sign-ins off, TOTP enrol and verify on, exact redirect URLs only (no wildcards), raised local rate limits for tests.

### 3.2 Routing and locales

- English is unprefixed. Greek lives under `/el` with the same slugs, implemented as a router `rewrite` (`src/lib/i18n/rewrite.ts`): on the way in `/el/x` becomes `/x?lang=el`, on the way out `lang=el` becomes the `/el` prefix. The root route retains `lang`; every loader reads it through `loaderDeps`, so cached loader data never mixes languages. `/admin`, `/auth`, `/api` and `/preview` are never prefixed.
- Route shapes: `/` home; `/$` CMS pages looked up by path in `pages`; typed collection routes `blog` and `blog/$slug`, `books` and `books/$slug`, `videos`, `gallery`, `shop` and `shop/$slug`, `masterclasses` and `masterclasses/$slug`, `events` and `events/$slug`, `press`, `foundation/stories/$slug`; utility routes `checkout/success`, `download/$token`, `confirm/$token`, `unsubscribe`, `preview/$token`. The studio refuses a page path whose first segment is reserved (`el`, `admin`, `auth`, `api`, `preview`, `checkout`, `download`, `confirm`, `unsubscribe`, `sitemap.xml`, `robots.txt`).
- Collection index pages are CMS pages too, so she controls their intro and section order; the collection renders through a section that cannot be removed from that page.
- Internal links use TanStack `Link` with intent preloading (hover and touchstart). No full page reloads.
- Language switch: a `Link` to the same internal path with `lang` toggled. Visible in the header on phones without opening the menu (English / Ελληνικά), and kept on `/start`.
- Language suggestion: no automatic redirects. When the browser prefers the other language and the twin page has approved content in it, a small bar at the bottom suggests it, written in the suggested language. It never covers the audio player or a buy bar, never takes focus, is not shown on `/start`, checkout, download, confirm or unsubscribe, and "Not now" hides it for a year. It renders after hydration, so the HTML is the same for every visitor.
- `<html lang>` is set on the server from the route. Redirects from the studio's table are applied in request middleware, for GET page requests only.

### 3.3 Data loading and performance

- Every public route loader calls a `createServerFn({ method: 'GET' })` data function. Public pages never import supabase-js. The data function queries with the publishable key (row-level security applies), validates section props with Zod on the server and returns them parsed, so Zod never ships to visitors. The server HTML is complete, in the right language.
- Loaders return only the fields the page needs. Greek overlays come in one query per page, not one per item.
- No edge HTML cache in v1 (Cloudflare does not cache a Worker's own responses, and the Cache API cannot purge globally without a zone token). HTML is rendered per request with `Cache-Control: private, no-cache`; token, preview, checkout and studio routes send `no-store` and `X-Robots-Tag: noindex`. Speed comes from Smart Placement, one batched query per page, and a per-isolate 60-second memo of site settings, navigation, social links and redirects. Static assets are cached long-term by hash. Edge caching with purge-by-tag is a post-launch option once the domain is a Cloudflare zone.
- Budgets: mobile Lighthouse 90+ on home, about, a book page, the blog index, a blog post and the shop; LCP under 2.5 s; public JS on the home page at most 150 KB gzip in total, of which app code (everything but React and TanStack) at most 45 KB. `scripts/check-public-bundle.mjs` fails the gate if `@supabase/*`, `zod`, `framer-motion`, `@tiptap/*`, `sanitize-html` or `cmdk` are reachable from a public route.
- Images use `<img srcset>` with WebP variants, explicit width and height, `object-position` from the image's focal point, `fetchpriority="high"` on the hero only, lazy loading elsewhere, and the dominant colour as a placeholder.

### 3.4 Security model

- **Accounts.** Signup is closed. Before launch, production `auth.users` and `user_roles` are listed read-only; any account that is not Anastasia's or Joel's is removed, and the remaining admins set passwords only they know. `createFirstAdmin` compares the setup secret in constant time and creates the role in one locked database transaction; `hasAnyAdmin` is removed.
- **Two-factor for everyone in the studio.** TOTP through Supabase Auth MFA. Enrolment asks for two authenticators (a phone and a second device or password manager) and will not finish with one. There are always at least two admins (Anastasia and Joel); the studio refuses to remove the last admin or the last factor of the last admin. A session at `aal1` sees only the enrol or challenge screen. Sessions on her own device stay signed in for 30 days of activity. `/auth/reset` and `/auth/accept` handle password resets and invites; Supabase Auth sends through custom SMTP on Resend. Break-glass recovery is `scripts/admin-mfa-reset.ts`, run by Joel locally with the secret key; it never ships in the worker.
- **Roles.** `admin` does everything. `translator` (for a Greek reader) can open only the translation queue, Greek alt text and Greek previews. `is_admin()` and `is_translator()` both require `aal2`.
- **Row-level security is the real protection.** Every table has RLS. Visitors read published rows only and write nothing directly. Every table except `user_roles` has a restrictive `require aal2` policy, so a leftover permissive policy can never grant an `aal1` session anything. Integration secrets, rate limits and Stripe events are invisible to every client role. `supabase/tests/policies.sql` asserts all of this in the gate and, read-only, against production right after the launch migration.
- **Studio writes** run in server functions behind `requireAdmin` (or `requireTranslator`) and use the caller's own JWT client, so RLS applies to every write. Multi-step writes (publish with version snapshot, restore, reorder, delete with children) are single `security invoker` Postgres functions. The secret key is allowed only in: public form handlers, the Stripe webhook, token routes, the outbox sender, integration-secret functions, cron tasks and `createFirstAdmin`; a lint rule on `client.server` enforces the list.
- **Audit.** `audit_log` is written by triggers on every studio table, with the actor from the session, so a write that skips the studio is still on record. Personal-data tables record changed column names only; large values are noted, not copied. Integration-secret changes record provider and last four characters only. Nobody can edit the log.
- **Public forms** (contact, newsletter, ebook gate, waitlist, checkout, donation) go through server functions with Zod, a honeypot, Cloudflare Turnstile when configured, and rate limits stored in Postgres (`hit_rate_limit`, keys are salted SHA-256 of `CF-Connecting-IP` or the lowercased email). Limits: contact 5 per IP per hour; newsletter and ebook gate 5 per IP per hour and one email per address per 24 hours (repeat requests get the same success message); checkout and donation sessions 10 per IP per hour; outgoing form emails 200 per day. Donations have a server-enforced minimum and maximum.
- **Rich text** is stored as sanitised HTML (and TipTap JSON in the studio). It is sanitised on every write path (studio saves, Gemini drafts, Greek edits and approvals), and sanitised again in the server loader before render, so a row written any other way renders inert. Existing rich text is re-sanitised when seeded. `sanitize-html` runs only on the server and is proven under workerd in Phase 1. Every URL field accepts only `https:`, `mailto:`, `tel:` or a site path starting with a single `/`. Embeds are stored as provider plus id, parsed with an exact hostname match, and the iframe `src` is rebuilt from the id.
- **Headers** on every response: HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, and a per-request Content-Security-Policy with a nonce for inline scripts, Supabase hosts, Stripe, Turnstile and the allowlisted embed hosts, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'`. A Playwright test asserts the headers and zero CSP violations.
- **Integration keys** entered in the studio are AES-GCM encrypted with `APP_ENCRYPTION_KEY` before storage, shown back as the last four characters, and decrypted only inside server functions.

### 3.5 Media pipeline

- One media library (`media_assets`) holds images, audio, video clips and documents. Every image, audio file and download on the site references it. Alt text, caption and credit are written once per asset (English on the asset, Greek through the translation queue) and reused everywhere.
- **Uploads.** `requestUpload` (requireAdmin) checks kind, MIME type and size, creates a pending `media_assets` row at a server-chosen path and returns a signed upload token per variant. The browser uploads with tus-js-client (6 MB chunks, retries, progress), to `https://<ref>.storage.supabase.co/storage/v1/upload/resumable` in production and `SUPABASE_URL/storage/v1/upload/resumable` locally. `confirmUpload` checks the objects exist and marks the asset ready. The asset appears in the library optimistically. The daily job removes uploads never confirmed after 24 hours.
- **Images** are encoded in a Web Worker: decode with `createImageBitmap` (applies EXIF orientation), resize in halving steps on an OffscreenCanvas no larger than 4096 px, encode WebP at 480, 960, 1600 and 2400 px wide (never larger than the original). Use the native encoder only if the result really is `image/webp`; otherwise `@jsquash/webp` (WASM, studio only), which is always the path on Safari and iOS. File inputs accept JPEG, PNG and WebP so iPhones hand over JPEG; HEIC is accepted where the browser decodes it and otherwise gets a message that says how to switch the camera to "Most Compatible". Every image has a focal point set with one tap, with previews of the arch, 4:5, 16:9 and full-bleed crops. The upload panel asks for English alt text at once and can suggest it with Gemini.
- **Buckets** (configured in a migration): `media` public, images and short video, 50 MB; `audio` public, MP3/M4A/AAC, 50 MB, free-to-stream audiobook chapters only; `downloads` private, PDF, EPUB and paid audio, served through short-lived signed URLs minted by the server. Visitors cannot list any bucket. Admin storage policies use `is_admin()`.
- Studio lists show 480 px variants only and paginate on the server.

### 3.6 Integrations

All configured in Studio → Settings → Integrations. Each shows Connected or Not connected, a test button and the masked key. Each sits behind one adapter (payments, email, translate, video).

- **Stripe.** Checkout for book formats sold here, shop products and donations, with Stripe Tax when configured. Prices and amounts always come from the database, never from the request. Orders and donations rows are created before Checkout and keyed by our own id (`client_reference_id`, `success_url=/checkout/success?order=<id>`). The studio asks for a restricted key. On save, and only on the production origin, the server replaces any endpoint it created earlier with one subscribed to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `customer.subscription.deleted` and `charge.refunded`, and stores its signing secret encrypted. `/api/stripe/webhook` reads the raw body first and verifies with `constructEventAsync` and the SubtleCrypto provider; the client uses `createFetchHttpClient`. Each event is applied once (`stripe_events`), status only moves forward, and receipts are queued in the outbox with the outbox id as Resend's idempotency key. Paid digital formats get download tokens shown on the success page and in the receipt. Physical formats collect a shipping address only if Joel confirms she posts parcels; Orders then gets "Mark as shipped". Monthly donations are Checkout subscriptions: every `invoice.paid` is its own donation row, a failed renewal or cancellation updates it, and receipts carry a Stripe customer portal link to change or cancel. `cancel_url` returns the reader to where they were with a "nothing was charged" note. `/checkout/success` reads our order and the Checkout Session on the server, thanks the reader as soon as Stripe reports it paid, and shows downloads when ready.
- Without Stripe, buy buttons show the format's retailer links; "Coming soon" only when a format has neither; the Donation section hides itself.
- **YouTube Data API v3.** API key and channel ID. Videos sync hourly from the cron and on demand from "Sync now". A sync claims a lease (`locked_until`) so only one runs, reads the uploads playlist with `channels.list`, `playlistItems.list` and `videos.list` (never `search.list`), copies thumbnails into the media library and upserts by video id. Synced videos can be hidden, featured or reordered; their text can be translated.
- **Resend.** API key and sender. Sends contact notifications and auto-replies, double opt-in confirmations, ebook links, waitlist confirmations, order and donation receipts, and newsletters, in the reader's language. Email copy she can edit lives in `email_templates`; fixed parts (legal footer, unsubscribe line) come from the message catalogs. Without a key, emails wait in the outbox and go out when Resend is connected.
- **Gemini.** API key and model. Drafts Greek in the studio only, and suggests English alt text. The key must belong to a billing-enabled Google Cloud project. Contact messages, donor data and personal names are never sent to it.
- **Turnstile** (optional). Site key and secret; when set, public forms require it.

## 4. Data model

The production database holds real content and subscribers, and its migration history is not fully known. Rules:

- Every migration is additive and idempotent (`if not exists`, guarded `alter`, policies dropped by looping over `pg_policies`), never drops a table or column that has data, and carries a rollback note. Seeds insert with `on conflict do nothing` and never overwrite. The three old seed migrations were changed to `do nothing` so a replay cannot overwrite live rows.
- **Before the launch push**, Joel (or Claude, read-only) takes a schema-only dump and `supabase migration list` of production. Every old migration whose effect is already in production is marked applied with `supabase migration repair`, and every object that exists only in production goes into one guarded reconcile migration. Production migrations are pushed only from the repo with `supabase db push --dry-run` first; the Supabase connector is read-only on production.
- Types are generated from the local stack (`bun run db:types`) after every migration.
- The migrations that change policies lock the old studio out (it signs in without two-factor), so nothing from the redo touches production before cutover (11, Phase 4).

### 4.1 Kept and extended

| Table | Change |
|---|---|
| `user_roles`, `has_role` | Keep. Add the `translator` role, `is_admin()` and `is_translator()` (role and `aal2`). Role changes go through the server only. |
| `content_translations` | `fields` holds only the live, approved Greek; `draft_fields` holds work in progress; `approved_by` (required when approved), `origin` (human, machine, fixture), `english_hash` and a computed `is_stale`, `show_english` to pull a stale item until it is updated. |
| `blog_posts`, `blog_categories` | `category_id`, `cover_media_id`, SEO fields, `reading_minutes`, `published_at`, `featured`. Placeholder seed bodies stay unpublished. |
| `books`, `book_reviews` | `subtitle`, `cover_media_id`, `featured`, `sections` (shown after the book's header), SEO fields, `published_at`; status gains `draft`. Reviews get `source` and `published`. `ebook_url` moves into the private bucket at cutover and is then nulled. |
| `products`, `product_categories`, `product_images` | Prices in cents, currency, stock, `stripe_price_id`, cover and delivery assets, `sections`, SEO; images reference `media_assets`. |
| `gallery_sections`, `gallery_images` | Albums and album items referencing `media_assets`, with description, cover and `published`. |
| `foundation_stories`, `foundation_categories` | `cover_media_id`, `sections`, SEO. Body re-sanitised when seeded. |
| `contact_messages` | Inserts only through a server function. `read_at`, `archived_at`, `locale`. |
| `subscribers`, `newsletters` | Double opt-in: hashed confirm token, `confirm_sent_at`, `confirmed_at`, `locale`, consent key and version, `consent_source`, `unsubscribed_at`. Existing rows get `consent_source = legacy_single_opt_in`; consent is never back-filled. Newsletters get `locale_mode` and `scheduled_for`. |
| `masterclass` | Copied once into `masterclasses` (many): dates, format, location, price label, enrol link or shop product, availability (open, waitlist, closed), `sections`. Retired after launch. |

### 4.2 New

| Table | Purpose |
|---|---|
| `site_settings` | One row: site name, tagline, contact email, default SEO, social image, footer text, legal entity details, charity number. |
| `integration_secrets` | Encrypted third-party keys, non-secret config, status, the sync lease. No client access. |
| `pages` | Every page: path, kind, `locked` (system pages), title, SEO, `sections` (the live list), status, timestamps. |
| `content_drafts` | Unpublished edits of any publishable item (page, post, book, product, masterclass, story, event, audiobook). Admin only. |
| `content_versions` | What was live after each publish; newest 20 per item; restoring loads one into the draft and never changes the live item. |
| `preview_tokens` | Shareable draft previews for any publishable item: SHA-256 of the token, expiry (default 7 days, at most 30), revocation. |
| `redirects` | From path, to path, 301 or 302, hit count. Changing a page's path creates one and updates navigation. |
| `navigation_items` | Header, footer and legal menus: label, page or URL, position, parent. |
| `social_links` | The one list of social profiles used everywhere. Replaces `start_page_socials`. |
| `media_assets` | Kind, bucket, path, mime, bytes, size, duration, variants, dominant colour, focal point, alt, caption, credit, upload status. |
| `book_formats` | Per book, format and language: sold here (price, Stripe price, delivery file) or elsewhere (retailer and link), ISBN. |
| `book_files` | Free downloads and samples per book and language, all in the private bucket. |
| `audiobooks`, `audiobook_tracks` | An audiobook per book and language, with cover, narrator and ordered chapters; each chapter free to stream or paid. |
| `events`, `press_mentions` | Talks, readings and signings with time zone and ticket link; press mentions with outlet, headline, date, link and logo. |
| `videos` | Synced from YouTube; thumbnail copied to the media library; hidden, featured, position. |
| `testimonials` | Quote, name, role, book, photo, published. Seeded unpublished until confirmed. |
| `leads` | Ebook downloads and waitlists: first name, email, locale, source, consent key and version, optional newsletter opt-in. One per email and source. |
| `download_tokens` | Hashed token for a lead or a paid order item, asset, expiry (7 days), use count. |
| `orders`, `order_items` | Our id first, then Stripe session and payment ids, email, status, fulfilment, totals, currency, locale, return path. |
| `donations` | One row per payment; Stripe ids (session, invoice, subscription, customer), amount, one-off or monthly, donor, message, anonymous flag, status. |
| `stripe_events` | Event ids already applied. |
| `email_outbox` | Queued and sent emails: template, locale, recipient, status, attempts, last error. `params` (with links encrypted) is cleared once sent. The studio never shows bodies or links. |
| `email_templates`, `consent_texts` | Editable email copy; versioned consent wording (editing creates a new version). Greek through the queue. |
| `ui_string_reviews` | Human approvals of Greek UI strings, by key and hash of the approved text. |
| `audit_log` | Actor, action, entity, changed columns, before and after (redacted per table). Written by triggers only. |
| `rate_limits` | Counters for public forms. Server only. |

### 4.3 Retired after launch

`page_content`, `start_page_settings`, `start_page_links`, `start_page_socials`, `foundation_settings`, `masterclass` and `src/data/site.ts`. Seeds copy their live rows into the new tables (reading production, never repo snapshots), then nothing reads them. They are renamed to `legacy_*` only after the DNS switch, and dropped only with Joel's go-ahead.

Long-form copy that sits in `src/lib/i18n/messages` today (biography chapters, values, book chapters, foundation copy) moves into sections; its Greek moves into `content_translations` as Draft, never Approved.

Seed exclusions: rating lines, review counts, community and word counts, and the named testimonials and reviews from `site.ts` and the message catalogs are seeded hidden and flagged "needs confirmation" on the dashboard. Passages with conflicting biography facts (her son's age, which losses are in chapter 05) are seeded hidden until she picks the correct version.

### 4.4 Retention and erasure

`purge_expired()` runs daily: unconfirmed subscribers after 30 days; archived contact messages after 24 months; leads after 24 months unless they confirmed the newsletter; outbox params after 7 days and rows after 12 months; expired tokens after 30 days; audit entries after 24 months. Orders and donations keep financial fields for the accounting period Joel's accountant confirms, then names, emails and addresses are cleared. Studio → People → "Find a person" searches every table by email and offers Export (for access requests) and Erase (deletes subscriber, lead and contact rows, anonymises orders and donations, redacts the audit log). Server code never logs request bodies, email addresses, tokens or decrypted keys. `/privacy` states these periods and lists the processors (Supabase, Cloudflare, Stripe, Resend, Google).

## 5. Page builder

Every page, and every book, product, masterclass, story and event page, is an ordered list of sections (collection items show theirs after a fixed header driven by the item's fields; blog posts keep a reading layout around their rich text). A section type is one React component, one Zod schema and one studio form, registered in `src/sections/registry.ts`. Each section has a stable uuid kept through draft, publish and restore.

- **Validation before publish.** The studio validates every section with its schema. Publish stays disabled until a plain-language checklist is clear ("Gallery: choose at least one photo"), each item opening its field. In the studio preview, a section that would be skipped shows as a warning card.
- **Safety net.** On the public site, an unknown type or invalid props skip that section (logged once and shown on the dashboard); a broken section never breaks a page.
- **Shared settings:** hidden, anchor id, width (narrow, default, wide, full), spacing (compact, default, generous), and background (Warm ivory, Peach cream, Cocoa). Colours, fonts, custom CSS, raw HTML and scripts are never editable.
- **One H1 per page:** only the hero (or the item header) renders an H1.
- **Empty collections:** a section fed by an empty collection hides itself publicly; the studio preview says why.

| Section | Layout variants | Notes |
|---|---|---|
| Hero | portrait in arch, full-bleed photo, text only | One per page; the only section with `fetchpriority` |
| Audiobook player | single book, shelf of books | See below |
| Featured book | cover left, cover right | Formats with buy or retailer links, ebook gate inline or linked |
| Book list | grid, rows | From `books` |
| Book excerpts | cards, stacked | Chapter title and short excerpt, bound to a book |
| Ebook gate | inline, card | See below |
| Rich text | one column, with pull quote | Sanitised |
| Two column | image left, image right | Image and text |
| Quote | large, with portrait | |
| Image | contained, full bleed | |
| Gallery | grid, masonry, carousel, filmstrip | From an album or hand-picked assets; keyboard lightbox |
| Video | single, grid, latest | From `videos`; click-to-load facade |
| Latest posts | grid, list | From `blog_posts`, filtered by category |
| Stats | row | Numbers with labels; seeded hidden until confirmed |
| Timeline | vertical | Life chapters |
| List | numbered, plain | Values, beliefs |
| Testimonials | single, carousel | From `testimonials`, optionally for one book |
| Products | grid | From `products`, filtered by category |
| Masterclasses | list, cards | From `masterclasses` |
| Events | upcoming list, cards | From `events`; past events move to a Past list; times in the reader's time zone with Cyprus time noted |
| Press | logo row, list | From `press_mentions` |
| Media kit | default | Short and long bio with copy buttons, hi-res portraits and covers to download |
| Foundation stories | grid, list | From `foundation_stories` |
| Donation | card, band | Preset amounts, bounded custom amount, one-off or monthly |
| Newsletter | inline, band | Double opt-in |
| Contact form | default | Enquiry types: General, Speaking, Media, Partnerships |
| FAQ | accordion | |
| Call to action | band, card | One primary action |
| Link list | stacked | For the link-in-bio `/start` page, with social links |
| Embed | default | YouTube, Vimeo, Spotify, Google Maps only; click-to-load facade |

- **Audiobook player.** Plays the audiobook for the page's language; if that language has none, plays the English edition with a quiet note that the Greek edition is coming (chapter titles in `lang="en"`); hidden if none is published. Chapters, scrubber with chapter ticks, speed, a large play control, and "Continue chapter 3 at 12:40" for returning listeners. Playback lives in the root layout: leaving the page docks a slim player at the bottom, and audio keeps playing across navigation and language switches. The Media Session API drives the lock screen and headphones. `preload="none"` until play. Non-free chapters show a lock and the buy button. Chapter upload takes many files at once, orders them by filename, reads titles from tags and durations automatically; MP3 and M4A only.
- **Ebook gate.** Gives the book's free file for the page's language (the Greek file when one exists, otherwise English with a note), EPUB and PDF where both exist. Fields: first name and email, a privacy line (not a checkbox), and a separate unticked "Also send me Anastasia's letters". The download never depends on the opt-in. Success shows the download button at once and says the link was also emailed. The same email asking again gets a fresh link, not a second lead. An expired link page offers "Email me a fresh link".
- **Embeds and videos** render as a static facade (poster from the media library, title, play button). The iframe (youtube-nocookie for YouTube) loads only on click, so nothing reaches a third party before that click and no consent banner is needed.

## 6. Pages

Every page exists in English and Greek, is seeded from today's content, and is fully editable.

| Page | Path | Built from |
|---|---|---|
| Home | `/` | Hero, audiobook player, featured book with ebook gate (carrying the newsletter opt-in), "About Anastasia" two column, one testimonial, latest posts, latest video, foundation band linking to `/foundation` |
| About | `/about` | Hero, timeline, two column, list, quote, call to action |
| Books | `/books`, `/books/$slug` | Collection index; each book is a section list from the Book template (book header with formats and buy, excerpts, quote, audiobook player, testimonials for this book, author bio, ebook gate) |
| Journal | `/blog`, `/blog/$slug` | Index with categories and server pagination; post with reading time and related posts |
| Videos | `/videos` | Video sections fed from YouTube |
| Gallery | `/gallery` | Gallery sections by album |
| Masterclasses | `/masterclasses`, `/masterclasses/$slug` | List and detail with enrol link or waitlist form |
| Events | `/events`, `/events/$slug` | Upcoming and past |
| Press | `/press` | Press mentions and media kit |
| Shop | `/shop`, `/shop/$slug` | Products; Buy now to Stripe Checkout |
| Foundation | `/foundation`, `/foundation/stories/$slug` | Mission, stories, donation |
| Start | `/start` | Link-in-bio page, no site chrome, small language switch |
| Contact | `/contact` | Contact form, social links |
| Legal | `/privacy`, `/terms`, `/cookies`, `/refunds` | Rich text; drafts clearly marked until real details are filled in |
| Utility | `/unsubscribe`, `/confirm/$token`, `/download/$token`, `/checkout/success`, 404, error | Designed states, both languages |

- **System pages** (home, collection indexes, contact, start, legal) cannot be deleted and keep their path. Changing any other page's path creates a 301 and updates navigation; deleting a page that something links to asks first and lists the links.
- **Empty collections:** the navigation item hides itself, the index leaves the sitemap and gets `noindex`, and a direct visit shows a designed page ("No masterclasses are open right now") with a waitlist or newsletter form and links to Books and the Journal.
- **Header:** at most five items (About, Books, Journal, Foundation, Contact) plus the language switch. Everything else goes in the footer.
- `/confirm/$token` shows a "Confirm subscription" button; only the POST confirms (mail scanners prefetch links). Every newsletter carries `List-Unsubscribe` and `List-Unsubscribe-Post` headers and a one-click unsubscribe that works without JavaScript.

## 7. Studio

Lives at `/admin`, client-rendered, same orange identity in a denser layout, designed for a phone first.

- **Dashboard**: what needs attention (stale or missing Greek, machine Greek needing a person, unread messages, failed emails, unfulfilled orders, hidden sections, content flagged "needs confirmation"), recent activity, quick actions.
- **Pages**: list, create (the Greek twin exists automatically), page builder with section list (reorder, hide, duplicate, delete with undo), live preview, inspector, variant picker, width, spacing, background, SEO panel, draft and publish with the checklist, shareable preview link, version history with restore.
- **Collections**: Journal, Books (with formats, files and template), Audiobooks, Videos, Gallery albums, Products, Orders, Masterclasses, Events, Press, Foundation stories, Donations, Testimonials.
- **Draft and publish everywhere.** Every content type the public sees uses the same Draft → Publish model, status pill, shareable preview and version history. Drafts autosave to the server two seconds after typing stops, with a "Saved" or "Not saved, retrying" indicator; edits made offline are kept on the device and sent when the connection returns. Navigation, footer, social links and settings save straight to the live site, say so above the Save button, and offer Undo for 10 seconds.
- **Media library**: grid of thumbnails, server pagination, search, upload with progress and retry, alt text, focal point, usage ("used on 3 pages"), safe delete.
- **Translations**: one queue across every content type, one item per section or collection item, filtered by state (Missing, Draft, Approved, Stale, Machine) and type. Side-by-side English and Greek editor; a Stale item shows a word-level diff of the English since approval and offers "Greek still correct"; "Draft with Gemini" on a filtered selection; "Preview in Greek" renders the real page with the draft Greek in place; Approve. UI strings from `el.ts` are in the queue too.
- **Site**: Navigation (header and footer), Footer, Social links, Settings, SEO defaults, Redirects, Emails and forms (email subjects and bodies, form success texts, consent wording, with preview and "Send me a test"), Integrations.
- **People**: Inbox, Subscribers and Leads (with CSV export), Newsletters (compose in English with Greek through the queue; Greek subscribers get Greek only once approved, otherwise she chooses "Send English to everyone" or "Wait"; preview, test-send, send now or schedule, sent log), Find a person (export and erase), Admins and translators (invite, remove).
- **Account**: two-factor setup (two authenticators), password, sign out.
- **Audit log**: who changed what, when, with before and after.
- **Phone layout**: the page builder is two screens: the section list (each row with Move up, Move down, Hide and a menu; drag optional) and the section form as a full-screen sheet. Preview is a tab with EN/ΕΛ and phone/desktop toggles. Save and Publish sit in a bottom bar. No control is hover-only. Cmd+K and Cmd+S are shortcuts for a visible search button and the Save button.

## 8. Translations

- UI strings live in `src/lib/i18n/messages/{en,el}.ts` with typed parity, including the studio, sign-in and email namespaces. No hard-coded strings in components. The studio language is a per-admin preference, English by default.
- CMS content is stored in English; Greek is an overlay in `content_translations`. Pages translate per section (entity `page_section`, id = the section's uuid) plus `page_meta` for title and SEO; collection items translate per item; alt text and captions per media asset. Each adapter declares its translatable fields as an allowlist of plain-text and rich-text keys, and applying an overlay copies only those keys, so URLs, embeds, media ids, prices, slugs and anchors never come from a translation.
- States: **Missing** (no Greek), **Draft** (Greek in `draft_fields`, not live), **Approved** (live in `fields`), **Stale** (approved, but the published English changed since). Stale Greek keeps showing until re-approved, unless set to "Show English until updated". Gemini and editors write `draft_fields` only; Approve copies the draft into `fields` and records the approver and source hashes.
- **Who approves.** A person who reads Greek: Anastasia, or a reader she names who gets the `translator` role. Machine output is never published unreviewed. Greek written by Claude is imported as Draft. Greek that production shows as approved today was Gemini output approved without a named reviewer; it goes back to Draft, flagged "Machine, needs a person" at the top of the queue. Only the approve server function sets Approved; the database requires an approver.
- **Greek UI strings** in `el.ts` follow the same rule: the queue lists every key, and approvals are stored in `ui_string_reviews` by the hash of the approved text. Launch readiness on the dashboard shows how many UI strings still need a person.
- **On a Greek page**, a section or list item with no approved Greek renders in English inside `lang="en"`, and the page shows a quiet Greek notice whenever any visible part is in English. Collection sections on Greek pages list only items with approved Greek, with an "Also show English-only items" setting; a list that would be empty falls back to English items labelled "in English".
- Layouts are tested with Greek strings, which run 20 to 30 percent longer: the local seed (never production) includes approved fixture Greek (`origin = fixture`) for every section type and collection, some of it 30 percent longer than the English and with words over 20 characters. The seed refuses to run against the production project.

## 9. Design

`DESIGN.md` and `src/styles.css` are the design lock and are updated before any design change. Until `DESIGN.md` is rewritten in Phase 1, this section overrides it.

- Palette tokens only: Tangerine #F27329, Burnt orange #C2410C, Apricot #FFB27A, Peach cream #FFF1E6, Warm ivory #FFFAF5, Cocoa ink #3B1F14, Berry #7A2E4A, Blush #F7C9C0, plus the warm dark grounds defined in `DESIGN.md`. Token names say what they are; the legacy `--plum` and `--burgundy` names are removed.
- **Contrast.** Text on Tangerine is always Cocoa ink; Warm ivory or white on Tangerine is never used at any size. Orange text on Warm ivory or Peach cream is Burnt orange. On Blush, text is Cocoa ink only. On dark grounds, orange text and links are Apricot or Tangerine, never Burnt orange. Apricot is decorative only (hairlines, dividers); input borders, focus rings and other meaningful non-text UI use Burnt orange or Cocoa ink (Apricot on dark). The focus ring is 2 px with a 2 px offset. WCAG AA everywhere.
- Noto Serif Display for headlines of 28 px and up, Source Serif 4 for reading, Noto Sans for interface. Self-hosted, Latin and Greek subsets only. A fixed type scale, a 4 px spacing scale and a 4/12-column grid are tokens.
- Flat cards, 12 px radius, 1 px hairline. No shadows, gradients or glass, except a blur behind the sticky header. The arch mask only on her portrait and book covers.
- **Motion is rare and slow.** No scroll-triggered reveals. Allowed: one hero entrance per page (opacity only, content fully visible in the server HTML and without JavaScript), the language-switch crossfade, lightbox and menu open and close, the audio progress bar, and a thin Tangerine progress line during slow navigations. All of it off under reduced motion. Nothing loops; nothing above the fold starts hidden.
- **Signature moments** (written into `DESIGN.md` before page work): the home hero (her portrait in the arch filling the first phone screen, headline in Noto Serif Display with one Tangerine accent, one primary action); the audiobook player as a crafted object; book pages presenting the cover as an artifact with buy options beside it and a sticky buy bar on phones.
- Real photography in a few fixed ratios, cropped at the focal point. No stock or generated images.
- **States**, in both languages: a slow client navigation shows the progress line and keeps the current page; a failed navigation shows the error in place with "Try again"; forms keep everything typed on any error, say what to do next and never show server text; offline navigation or submit says "You're offline. We'll try again when you're back" and retries on reconnect; the audio player pauses and resumes from its position. No service worker in v1. The 404 links to Books, the Journal and Contact.

## 10. SEO

- One canonical per page, absolute. Reciprocal `hreflang` pairs (`en`, `el`, `x-default`) once a page has approved Greek.
- An `/el` URL whose page or item has no approved Greek title and body renders English with the notice; its canonical is the English URL, it has no hreflang alternates and it is left out of the sitemap. Once approved, both URLs self-canonicalise with reciprocal hreflang, and a later Stale or Missing section does not withdraw them.
- Titles and descriptions per page and language from the studio, with defaults from site settings. Open Graph and Twitter cards with absolute image URLs.
- `sitemap.xml` from published pages and collections, Greek URLs only when approved; empty collections left out. `robots.txt` from site settings, disallowing token and preview routes.
- JSON-LD: `Person` for Anastasia, `Book` for books, `Article` for posts, `Event` for events, `Organization` for the foundation, `BreadcrumbList` on inner pages.

## 11. Phases and gates

Every phase ends with a green gate in English and Greek and with something Joel can open: a Cloudflare preview once hosting is connected, otherwise the local workerd build with screenshots. `bun run gate` = typecheck, lint, database checks, Cloudflare build, secrets check, public bundle check, Playwright (and from Phase 4, Lighthouse and axe).

**Phase 1. Groundwork and the new look**
- This brief; the current-state map. (Done.)
- Cloudflare build, Playwright in the gate, runtime public config, one route tree with the rewrite. (Done.)
- Database for the redo with policy assertions and publishing tests. (Done.)
- Design system: `DESIGN.md`, tokens in `src/styles.css`, self-hosted subset fonts, legacy tokens renamed, primitives (button, link, field, card, badge, toast, skeletons, empty and error states).
- Site shell (header, footer, language switch, skip link, 404, error, language suggestion), security headers, public data through server functions.
- Exit: every existing page renders in the new shell and type, in both languages, with a green gate.

**Phase 2. Page builder and studio**
- Section registry and every section in section 5 except Audiobook player, Ebook gate, Donation, Products and Video (Phase 3); Featured book shows retailer links.
- Seed today's live content into pages and sections (with the exclusions in 4.3); stop reading `site.ts` and the legacy tables.
- Rebuild every public page on sections.
- Studio shell, dashboard, page builder, media library, translations queue, collections, site managers, two-factor sign-in with two authenticators, invites and resets, audit log, Cmd+K.
- Exit: nothing public is hard-coded; the Phase 2 tests in section 12 pass.

**Phase 3. Books, audio and payments**
- Audiobooks and the player; ebook gate, leads, download tokens; YouTube sync; Stripe Checkout for book formats and products with orders; donations one-off and monthly; Resend with the outbox and cron; newsletters; integrations screen.
- Exit: purchase, donation, download and newsletter flows pass end to end against stripe-mock and `e2e/fake-services.ts` (a local server implementing the Resend, YouTube and Gemini endpoints the worker calls, with `GET /_sent` for assertions). Tests fulfil `checkout.stripe.com` with `page.route` and post signed webhook events themselves.

**Phase 4. Prove it and launch**
- The full end-to-end list, axe, Lighthouse 90+ mobile on key pages, a Greek layout review, and the Greek UI strings reviewed by a person.
- Production, in order: (1) agree a content freeze with Anastasia and make the old studio read-only; (2) Joel takes a backup on his own machine and a list of storage objects (backups never go into the repo or the cloud container); (3) reconcile migration history and push migrations with a dry run first; run `supabase/tests/policies.sql` read-only and stop if it fails; (4) run seeds that read the live legacy rows with `on conflict do nothing`; (5) clean up auth users, set worker secrets, deploy, move DNS from Vercel to Cloudflare, verify; (6) delete the Vercel project and its environment variables; (7) switch to new `sb_publishable_` and `sb_secret_` keys and disable the legacy JWT keys; revoke the Gemini key that lived in Vercel and re-enter keys in the studio; (8) only then rename legacy tables to `legacy_*`.
- Exit: Joel opens the live site and the studio and everything works.

## 12. End-to-end tests

Each runs on a phone viewport and a desktop viewport, in English and Greek where the flow has text. A setup project creates the first admin, enrols two TOTP factors (codes from the `otpauth` package) and saves one aal2 session for the studio specs. Specs that change global state (navigation, settings, redirects, translations, integrations) run serially on desktop after the read-only public specs; specs that create content put the project name in every slug. Every run starts from `supabase db reset`.

Database (in the gate as `db:check`, already running):
- Policy assertions: RLS everywhere, admin access only through `is_admin()`, no visitor writes, restrictive aal2 policies, server-only tables invisible, no public storage listing, approved Greek always names a person.
- Publishing: publish, protected columns, draft removal, versions trimmed to 20, restore into draft only, audit entries, stale detection, aal1 and translator limits, visitors never see drafts.
- What the public key can and cannot do through PostgREST and Storage.

Public (Phase 1 and 2 unless marked):
1. Every page renders from the CMS with one H1, correct `lang`, one canonical, reciprocal hreflang where approved, no console errors; an untranslated `/el` page canonicalises to its English URL.
2. Switching language keeps you on the same page, without a full reload, and the content changes language.
3. (Phase 3) Audiobook player: play, pause, seek, next chapter, speed, keyboard; the Greek site plays the Greek edition; audio keeps playing after navigating to About; Media Session metadata is set.
4. (Phase 3) Ebook gate: validation, success, download works, the lead is stored once, the email is sent; an expired link offers a fresh one, and it works.
5. (Phase 3) Newsletter: subscribe, confirm by button, unsubscribe one-click; compose, test-send and send to English and Greek subscribers.
6. Contact: send a message, see it in the studio inbox, notification email queued.
7. Journal: index with category filter and pagination, post page, related posts.
8. Books: list and book page with formats and buy or retailer links.
9. (Phase 3) Shop and books: Buy now to Checkout (mock), webhook marks the order paid, success page, receipt, download link for a digital format; cancel returns with the note.
10. (Phase 3) Donation: one-off and monthly; a renewal records a second payment; cancelling through the portal (mock) marks it cancelled.
11. Videos and gallery variants render; embeds load only after a click and only from allowlisted providers.
12. Redirects from the studio work; unknown pages return a designed 404.
13. Reduced motion and dark mode render correctly; axe finds no serious issues.
14. A page with an unknown section type and one with invalid props render everything else with status 200.
15. Draft Greek, or an unapproved edit of Stale Greek, never appears on `/el`, in the HTML or through PostgREST.
16. `sitemap.xml` lists English URLs and only approved Greek URLs; `robots.txt` matches site settings.
17. Header, mobile menu (focus trap and return) and gallery lightbox work fully by keyboard.
18. Losing the network during navigation or a form submit shows the offline state, keeps input and recovers.
19. Security headers are present and the CSP reports no violations; stored `<img onerror>`, `javascript:` links and iframes render inert in EN and EL.

Studio:
20. Sign-in requires two-factor with two authenticators; an `aal1` session and a translator cannot write content, even through PostgREST or Storage directly.
21. First-admin bootstrap works once and never again; invite an admin, accept, enrol; reset a password.
22. Create a page (Greek twin appears), add, reorder, hide sections, change a variant, autosave, open the shareable preview, publish (blocked with a readable reason while a section is incomplete), see it live.
23. Restore an earlier version into the draft; the unsaved-changes warning and undo toast work.
24. Upload an image: resized to WebP, progress shown, retries after a forced failure, appears in the library at once, focal point set, unsupported formats explained; publish lists images without Greek alt.
25. Navigation, footer, social links, settings, SEO fields and redirects change the public site; changing a page path creates a redirect.
26. Translations: draft with Gemini (fake), approve, Greek appears publicly; edit and publish the English and the item turns Stale with a diff; "Greek still correct" re-approves.
27. (Phase 3) Integrations: save a Stripe key (stored encrypted, shown masked), run the YouTube sync (fake).
28. Collections: create, edit, publish and delete for journal, books, products, masterclasses, events, press, stories, testimonials, and (Phase 3) audiobooks with chapter upload.
29. (Phase 3) Orders, donations, subscribers and leads lists paginate and export; Find a person exports and erases.
30. Every action above appears in the audit log; Cmd+K finds pages and content.

## 13. What only Joel or Anastasia can provide

Needed for previews (Phase 1 and 2 can be shown locally until then):
- GitHub: an empty private repository, connected to Claude.
- Cloudflare: an account on the Workers Paid plan ($5/month), with an API token (Workers Scripts: Edit) stored as the GitHub Actions secret `CLOUDFLARE_API_TOKEN`.
- Supabase: read-only access to `extyqqkasmchctvoltbm` from the Supabase connector (live schema and migration history); and either Branching for preview databases or a decision to keep previews local until launch.
- The cloud environment allowing `*.supabase.co` and `*.workers.dev`.

Needed before launch:
- A content freeze date with Anastasia, and Joel's backup of production taken on his own machine.
- The canonical host (www.anastasiapatience.com, as today) and moving DNS from Vercel to Cloudflare.
- Supabase Auth custom SMTP through Resend (set in the Supabase dashboard).
- Who reviews and approves Greek: Anastasia, or a named Greek reader who gets the translator role, with time booked before launch to clear the queue (including the Greek UI strings).
- Stripe business details and tax registrations for Stripe Tax; which book formats are sold here and which stay at retailers; whether she posts paperbacks or shop products herself.
- Which file is free behind the name-and-email form (the full ebook, as Joel said, unless he prefers a sample), in English and Greek.
- Whether the whole audiobook is free to stream or only sample chapters.
- Whether existing subscribers (single opt-in) receive newsletters or get one re-permission email.
- Confirm or remove the stats, ratings, review counts, named testimonials and the conflicting biography facts.
- Logo: keep the gold monogram or supply an SVG mark that works on the orange palette.
- How long orders and donations must be kept (from Joel's accountant).
- In the studio after launch: Stripe, YouTube, Resend, Gemini (billing-enabled project) and optionally Turnstile keys; Resend needs the sending domain verified.
- Content: the audiobook audio files (English and Greek), the ebook files, the Greek edition's details, any new photography, legal details for the privacy, terms and refund pages, and whether the foundation is a registered charity (this decides the donation wording and receipts).

## 14. Implementation details

Smaller rules from the review, kept here so they are not lost.

- **Working rules:** one concern per commit; one migration per data change; fix root causes; never add `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `.skip` or `.only`, and never lower a threshold to get the gate green. No autonomous loops: delete `ralph.yml`, `PROMPT.md` and `.ralph/bin`, and remove remaining Vercel references.
- **Motion and libraries:** Framer Motion is used only in the studio. Public motion is CSS (transitions, scroll-snap for carousels, the View Transitions API for the language crossfade where supported).
- **Sessions:** `is_admin()` and `is_translator()` also require the session to exist in `auth.sessions`, so signing out or revoking a session cuts access at once. Account offers "Sign out of all devices".
- **CSRF:** `src/start.ts` puts `createCsrfMiddleware` first for server functions; the Stripe webhook is a server route and is unaffected.
- **Keys:** AES-256-GCM through Web Crypto; `APP_ENCRYPTION_KEY` is 32 random bytes in base64, imported once as non-extractable; a fresh 12-byte IV per encryption and `provider:name:key_version` as additional data.
- **Download links:** 32 random bytes in base64url, stored as SHA-256; `/download/$token` validates, counts the use and redirects (302) to a short-lived signed URL.
- **Images:** only re-encoded variants are stored, which drops EXIF including GPS; originals are never uploaded to a public bucket.
- **Headings:** the page title is the only H1 (the Hero renders it; otherwise a quiet title band). Section headings are H2, item headings H3. Rich text offers H2 and H3 only, and paste from Word or Google Docs is cleaned to the allowed marks at paste time.
- **Paths:** changing a published page path or item slug adds a 301 for both languages.
- **Legal pages and consent texts:** Stale Greek is not shown; `/el` shows the English with the notice until a person re-approves it.
- **Praise:** book reviews are migrated into testimonials with an optional book link, then retired; one Praise manager in the studio.
- **Foundation stories:** `consent_recorded` is required to publish; `anonymise` shows the first name only and hides face photos. The form explains why.
- **Site settings** hold the logo, favicon source and default social image; `site.webmanifest` is generated from settings and tokens.
- **Forms in the studio:** every field has a plain label and one line of help; text fields show a recommended length and warn when the English is long enough that Greek will wrap badly; the variant picker shows small pictures of each layout; every drag has a keyboard path and visible Move up and Move down buttons.
- **Creating a page** offers starting layouts (Story page, Event or talk, Free download landing page, Blank); placeholder text blocks Publish until replaced; afterwards the studio asks "Add to the menu?".
- **Studio menu** grouped by task: Pages; Write (Journal, Books, Audiobooks, Stories, Events, Press, Praise); Sell and give (Shop, Masterclasses, Orders, Donations); Readers (Inbox, Subscribers, Leads, Newsletters); Library (Media, Videos, Gallery albums); Greek (Translations); Site (Navigation, Footer, Social links, Settings, Emails and forms, Redirects, Integrations); People; Audit log.
- **Dashboard** shows failed emails with the reason in plain words and Retry, physical orders to post, new donations, and integrations that are disconnected or in Stripe test mode ("Readers can't pay yet").
- **CSV exports** prefix cells starting with `=`, `+`, `-`, `@`, tab or carriage return with a single quote; every export is in the audit log with type and row count.
- **Canonical host** is `https://www.anastasiapatience.com`; the apex redirects to it; any other host gets `X-Robots-Tag: noindex`.
- **Lighthouse and axe:** axe through `@axe-core/playwright` inside the e2e specs from Phase 1, failing on serious or critical issues; Lighthouse CI from Phase 2 (mobile preset, three runs, after Playwright), asserting 90+ in Performance, Accessibility, Best Practices and SEO.
- **DNS move:** recreate MX, SPF, DKIM (Resend) and verification TXT records at Cloudflare before switching nameservers; attach `www` as a Workers Custom Domain.
