# Redo brief: Anastasia Patience

Source of truth for the redo, written 2026-10-22. It sits alongside `DESIGN.md` (the look), `src/styles.css` (the tokens), `supabase/migrations/` and `src/integrations/supabase/types.ts` (the data), and `docs/redo/current-state.md` (a map of the site as it was before the redo). If a request conflicts with this brief, follow the request and update the brief in the same change.

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
| Free ebook download behind a short name-and-email form | Joel |
| Instant language switching that keeps you on the same page | Joel |
| Rebuild in place rather than start a new codebase: the plumbing works, the design and the hard-coded pages are what is wrong | Claude |
| Claude has full authority to decide inside this brief; ask only for things only Joel or Anastasia can provide | Joel |

## 3. Architecture

### 3.1 Hosting and configuration

- Nitro `cloudflare-module` preset; `wrangler.jsonc` is merged into the generated worker config. `bun run build:cf` builds, `bun run preview:cf` runs the build under workerd locally.
- **One build for every environment.** Public configuration (Supabase URL, publishable key, site URL) is read from the worker's environment at request time and handed to the browser through the root route, never baked in with `import.meta.env`. The gate's build can then be deployed as-is, and Cloudflare needs no build-time variables. Remove every `VITE_*` read from app code.
- Worker secrets (set with `wrangler secret put` or the Cloudflare dashboard): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`, `ADMIN_SETUP_SECRET`, `APP_ENCRYPTION_KEY`. Nothing else lives in the environment. Third-party keys live in the studio (section 3.6).
- Local development runs against the local Supabase stack (`npx supabase start`), which applies every migration. Production data is never used for development or tests.

### 3.2 Routing and locales

- English is unprefixed; Greek lives under `/el` with the same slugs. One route tree uses an optional locale segment (`/{-$locale}/…`, where `locale` may only be `el`). The duplicated `el.*.tsx` files are deleted.
- Route shapes:
  - `/{-$locale}` home page.
  - `/{-$locale}/$` CMS pages, looked up by path in `pages` (about, foundation, start, contact, legal pages, any new page she creates).
  - Collection routes with typed loaders: `blog` and `blog/$slug`, `books` and `books/$slug`, `videos`, `gallery`, `shop` and `shop/$slug`, `masterclasses` and `masterclasses/$slug`, `foundation/stories/$slug`, `checkout/success`, `download/$token`, `unsubscribe`, `confirm/$token`.
  - Index pages for collections (blog, books, videos, gallery, shop, masterclasses) are also CMS pages, so she controls their intro and order of sections; the collection itself renders through a section.
- Internal links use TanStack `Link` with intent preloading. No full page reloads.
- Language switch: navigates to the twin URL of the current page (same path, prefix toggled), keeps the scroll anchor when the twin exists, and preloads the twin on hover. If a Greek page has no approved Greek, it still renders, with English content and a quiet notice in Greek.
- No automatic redirects by cookie or browser language. A first-time visitor whose browser prefers Greek sees a small, dismissible suggestion to read in Greek. Their choice is remembered in a cookie and only affects that suggestion.
- `<html lang>` is set on the server from the route. Redirects from the studio's redirect table are applied before routing.

### 3.3 Data loading and performance

- Every public page loads its data in route loaders on the server with an anonymous Supabase client. The server-rendered HTML is complete, in the right language. No public data is fetched in `useEffect`.
- Loaders return only the fields the page needs. Greek overlays are fetched in one query per page, not one per item.
- Static assets are cached long-term by hash. HTML responses carry short `s-maxage` with `stale-while-revalidate`. Publishing in the studio purges the affected paths.
- Budgets: mobile Lighthouse 90+ on home, about, a book page, the blog index, a blog post and the shop; LCP under 2.5 s on a mid-range phone; public JS under 120 KB gzip on the home page. Framer Motion, TipTap, sanitize-html and studio code never load on public pages.
- Images use `<img srcset>` with WebP variants, explicit width and height, `fetchpriority="high"` on the hero only, lazy loading elsewhere, and the media library's dominant color as a placeholder.

### 3.4 Security model

- Signup is closed (`auth.enable_signup = false` locally and in production). The first admin is created once with `createFirstAdmin` and `ADMIN_SETUP_SECRET`. Later admins are invited from the studio.
- Two-factor sign-in (TOTP through Supabase Auth MFA) is required for every admin. An admin session at `aal1` can see the enrol or challenge screen and nothing else.
- Every studio write goes through a server function that runs one `requireAdmin` middleware (valid session, `aal2`, `has_role(…, 'admin')`), validates input with the section or collection's Zod schema, writes, and records an audit entry. The browser never writes to tables directly.
- Row-level security on every table, defence in depth: public reads are limited to published rows; admin policies use `public.is_admin()` = `has_role(auth.uid(), 'admin') and auth.jwt()->>'aal' = 'aal2'`. Storage policies follow the same rule.
- Public forms (contact, newsletter, ebook gate, checkout, donation) go through server functions with Zod, a honeypot, and per-IP rate limiting. Anonymous `insert` policies are removed.
- Rich text is sanitised on save (server) and rendered without `dangerouslySetInnerHTML` on untrusted fields. Embeds are allowlisted: YouTube, Vimeo, Spotify, Google Maps.
- Third-party keys entered in the studio are encrypted with AES-GCM (`APP_ENCRYPTION_KEY`, Web Crypto) before they are stored, live in a table no client can read, are shown back only as the last four characters, and are decrypted only inside server functions.
- `scripts/check-secrets-not-in-client.mjs` stays in the gate.

### 3.5 Media pipeline

- One media library (`media_assets`) holds images, audio, video clips and documents. Every image, audio file and download on the site references it.
- Images are resized and compressed in the browser before upload: WebP variants at 480, 960, 1600 and 2400 px wide (never larger than the original), using the native encoder with a WebAssembly fallback where the browser cannot encode WebP. HEIC and other unsupported formats get a clear message.
- Uploads use resumable TUS uploads to Supabase Storage with visible progress, automatic retry and a retry button. The asset appears in the library optimistically and is confirmed when the upload finishes.
- Alt text in English and Greek is required before any page using the image can be published.
- Buckets: `media` (public, images and short video), `audio` (public, audiobook chapters, 50 MB per file), `downloads` (private, ebooks; served through short-lived signed URLs).
- Lists in the studio show 480 px variants only and paginate on the server.

### 3.6 Integrations

All configured in Studio → Settings → Integrations. Each shows Connected or Not connected, a test button, and the masked key.

- **Stripe**: Checkout for books, shop products and donations; Stripe Tax enabled when configured. Saving the secret key registers the webhook endpoint automatically and stores its signing secret. Webhooks (`/api/stripe/webhook`) mark orders and donations paid, idempotently.
- **YouTube Data API v3**: API key and channel ID. Videos sync on demand from the studio and lazily when the videos page is served more than an hour after the last sync. Synced videos can be hidden, featured or reordered; their text can be translated.
- **Resend**: API key and sender. Sends contact notifications, double opt-in confirmations, ebook links, order and donation receipts, in the reader's language.
- **Gemini**: API key and model. Drafts Greek translations in the studio only.

Without a key the related feature degrades gracefully: checkout buttons become "Coming soon", the videos section shows the last synced videos, emails queue in the outbox table and are sent when Resend is connected.

## 4. Data model

The existing production database holds real content and subscribers, and its exact state is not fully captured by the migrations. So every migration is additive and idempotent (`if not exists`, guarded `alter`), never drops a table or column that has data, and seeds never overwrite existing rows. Tables are retired by renaming to `legacy_*` once nothing reads them, and dropped only after launch with Joel's go-ahead. Each migration carries a rollback note and is followed by regenerated types.

### 4.1 Kept and extended

| Table | Change |
|---|---|
| `user_roles`, `has_role` | Keep. Add `is_admin()` (role and `aal2`) and use it in every admin policy. |
| `content_translations` | Keep the shape (entity_type, entity_id, locale, fields jsonb, status, source_hash). Add `approved_at`, `approved_by`, per-field source hashes. Stale is computed: approved and the English source hash no longer matches. |
| `blog_posts`, `blog_categories` | Add `cover_media_id`, `seo_title`, `seo_description`, `reading_minutes`. Placeholder seed bodies stay unpublished. |
| `books`, `book_reviews` | Add formats with prices, `stripe_price_id`, `ebook_media_id`, `sample_media_id`, `cover_media_id`, SEO fields. Reviews become translatable. |
| `products`, `product_categories`, `product_images` | Product images reference `media_assets`; add price, currency, stock, `stripe_price_id`, SEO. |
| `gallery_sections`, `gallery_images` | Become albums and album items referencing `media_assets`, with captions and order that reach the public site. |
| `contact_messages` | Inserts only through a server function. Add `read_at`, `archived_at`, `locale`. |
| `subscribers`, `newsletters` | Add double opt-in (`confirmed_at`, confirm token), `locale`, `source`, consent text version. |
| `foundation_stories`, `foundation_categories` | Keep as the stories collection. Body sanitised on save. |
| `masterclass` | Becomes `masterclasses` (many), with date, format, price, capacity, waitlist. |

### 4.2 New

| Table | Purpose |
|---|---|
| `site_settings` | Single row: site name, tagline, contact email, default SEO, social image, footer text, legal entity details. |
| `integration_secrets` | Encrypted third-party keys. No client access at all. |
| `navigation_items` | Header and footer menus: label, target page or URL, position, parent. |
| `social_links` | The one global list of social profiles used everywhere. Replaces `start_page_socials`. |
| `pages` | Every page: path, kind (home, standard, collection index, legal, link-in-bio), title, SEO fields, `draft` (sections jsonb), `published` (sections jsonb), status, timestamps. |
| `page_versions` | Snapshot on every publish and every manual save; the newest 20 per page are kept; any can be restored. |
| `preview_tokens` | Shareable draft previews: hashed token, page, expiry. |
| `redirects` | From path, to path, 301 or 302, hit count. |
| `media_assets` | Kind, bucket, path, mime, bytes, width, height, duration, variants, dominant color, alt (en, el), caption, credit. |
| `audiobooks`, `audiobook_tracks` | An audiobook per book and language, with cover, narrator and ordered chapters pointing at audio assets. |
| `videos` | Synced from YouTube: id, title, description, published date, duration, thumbnail, hidden, featured, position. |
| `testimonials` | Quote, name, role, photo, published. |
| `leads` | Ebook downloads: first name, email, locale, book, consent version, created at. Optional newsletter opt-in links to `subscribers`. |
| `download_tokens` | Hashed token, lead, asset, expiry (7 days). |
| `orders`, `order_items` | Stripe session and payment ids, email, status, totals, currency, locale. |
| `donations` | Stripe ids, amount, currency, one-off or monthly, donor name and email, message, anonymous flag. |
| `email_outbox` | Queued and sent emails, for retry and for the studio to show what went out. |
| `audit_log` | Actor, action, entity, before and after, time. Written by server functions only. |

### 4.3 Retired after seeding

`page_content`, `start_page_settings`, `start_page_links`, `start_page_socials`, `foundation_settings`, and `src/data/site.ts`. Their content is seeded into `pages`, sections, `social_links` and `site_settings`, then nothing reads them. Long-form copy that sits in `src/lib/i18n/messages` today (biography chapters, values, book chapters, foundation copy) moves into sections; its Greek moves into `content_translations` as **Draft**, never Approved, so a person reviews it.

## 5. Page builder

Every page is an ordered list of sections. A section type is one React component, one Zod schema and one studio form, registered in `src/sections/registry.ts`. Rendering looks a section up in the registry, validates its props, and skips it (logging once) if the type is unknown or the props fail validation. A broken section never breaks a page.

Every section has the same settings: hidden, anchor id, width (narrow, default, wide, full), spacing (compact, default, generous), and background (Warm ivory, Peach cream, Cocoa). Colors, fonts, custom CSS, raw HTML and scripts are never editable.

| Section | Layout variants | Notes |
|---|---|---|
| Hero | portrait in arch, full-bleed photo, text only | One per page at most; the only section allowed `fetchpriority` |
| Audiobook player | single book, shelf of books | Plays the audiobook for the page's language; chapters, scrubber, speed, resume position remembered per device |
| Featured book | cover left, cover right | Buy options, formats, ebook gate inline or linked |
| Book list | grid, rows | From `books` |
| Ebook gate | inline, card | First name, email, consent; returns the download and emails the link |
| Rich text | one column, with pull quote | TipTap content, sanitised |
| Two column | image left, image right | Image and text |
| Quote | large, with portrait | |
| Image | contained, full bleed | |
| Gallery | grid, masonry, carousel, filmstrip | From an album or hand-picked assets |
| Video | single, grid, latest | From `videos`; embeds are privacy-enhanced YouTube |
| Latest posts | grid, list | From `blog_posts`, filtered by category |
| Stats | row | Numbers with labels |
| Timeline | vertical | Life chapters |
| List | numbered, plain | Values, beliefs |
| Testimonials | single, carousel | From `testimonials` |
| Products | grid | From `products`, filtered by category |
| Masterclasses | list, cards | From `masterclasses` |
| Foundation stories | grid, list | From `foundation_stories` |
| Donation | card, band | Preset amounts, custom amount, one-off or monthly |
| Newsletter | inline, band | Double opt-in |
| Contact form | default | |
| FAQ | accordion | |
| Call to action | band, card | One primary action |
| Link list | stacked | For the link-in-bio `/start` page, with social links |
| Embed | default | Allowlisted providers only |

## 6. Pages

Every page exists in English and Greek, is seeded from today's content, and is fully editable.

| Page | Path | Built from |
|---|---|---|
| Home | `/` | Hero, audiobook player, featured book with ebook gate, latest posts, video latest, foundation band with donation, newsletter |
| About | `/about` | Hero, timeline, two column, list, quote, call to action |
| Books | `/books`, `/books/$slug` | Collection index page plus a book template (cover, formats, buy, ebook gate, audiobook, reviews, sample) |
| Blog | `/blog`, `/blog/$slug` | Index page with categories and server pagination; post template with reading time, related posts |
| Videos | `/videos` | Video sections fed from YouTube |
| Gallery | `/gallery` | Gallery sections by album |
| Masterclasses | `/masterclasses`, `/masterclasses/$slug` | List and detail with waitlist or checkout |
| Shop | `/shop`, `/shop/$slug` | Products, cart, Stripe Checkout, success page |
| Foundation | `/foundation`, `/foundation/stories/$slug` | Mission, stories, donation |
| Start | `/start` | Link-in-bio page, no site chrome |
| Contact | `/contact` | Contact form, social links |
| Legal | `/privacy`, `/terms`, `/cookies`, `/refunds` | Rich text pages; drafts are clearly marked until real details are filled in |
| Utility | `/unsubscribe`, `/confirm/$token`, `/download/$token`, `/checkout/success`, 404, error, offline | Designed states, both languages |

## 7. Studio

Lives at `/admin`, client-rendered, same orange identity in a denser layout, usable on a phone.

- **Dashboard**: what needs attention (translations stale or missing, unread messages, failed emails, unpaid orders), recent activity, quick actions.
- **Pages**: list, create (the Greek twin exists automatically), page builder with section list (drag to reorder, hide, duplicate, delete with undo), live preview, inspector form, layout variant picker, width, spacing, background, SEO panel, draft and publish, shareable preview link, version history with restore.
- **Collections**: Blog, Books, Audiobooks, Videos, Gallery albums, Products, Orders, Masterclasses, Foundation stories, Donations, Testimonials.
- **Media library**: grid of thumbnails, server pagination, search, upload with progress and retry, alt text in both languages, usage ("used on 3 pages"), safe delete.
- **Translations**: one queue across every content type with filters by state (Missing, Draft, Approved, Stale) and type; side-by-side English and Greek editor; Draft with Gemini; Approve.
- **Site**: Navigation (header and footer), Footer, Social links, Settings, SEO defaults, Redirects, Integrations.
- **People**: Inbox (contact messages), Subscribers and Leads (with CSV export), Newsletters, Admins (invite, remove).
- **Account**: two-factor setup, sessions, sign out.
- **Audit log**: who changed what, when, with before and after.

Behaviour everywhere: Cmd+K search across pages, content and settings; unsaved-changes warning on navigation; undo toasts for destructive actions; optimistic updates; every empty, loading and error state designed; server pagination with 480 px thumbnails; keyboard shortcuts for save (Cmd+S) and publish.

## 8. Translations

- UI strings live in `src/lib/i18n/messages/{en,el}.ts` with typed parity. No hard-coded strings in components.
- CMS content is stored in English; Greek is an overlay in `content_translations` per entity (a page's sections, a post, a book, a nav item, alt text and so on).
- States: **Missing** (no Greek), **Draft** (Greek exists, not approved), **Approved** (shown publicly), **Stale** (approved, but the English changed since). Stale Greek keeps showing publicly until re-approved, and is flagged in the queue and on the dashboard.
- Gemini drafts, a person approves. Machine output is never published unreviewed, and Greek written by Claude is imported as Draft, never Approved. The Greek already approved in production stays approved.
- Every new content type plugs into the queue through one adapter (which fields are translatable, how to read the English, how to apply the Greek).
- Layouts are tested with Greek strings, which run 20 to 30 percent longer.

## 9. Design

`DESIGN.md` and `src/styles.css` are the design lock and are updated before any design change. Summary of the rules:

- Palette tokens only: Tangerine #F27329, Burnt orange #C2410C, Apricot #FFB27A, Peach cream #FFF1E6, Warm ivory #FFFAF5, Cocoa ink #3B1F14, Berry #7A2E4A, Blush #F7C9C0. Dark mode is warm (#1F120C), never black. Token names say what they are; the legacy `--plum` (charcoal) and `--burgundy` (coral) names are removed.
- Orange text on light backgrounds is Burnt orange; text on Tangerine is Cocoa ink; never white on Tangerine at body size. WCAG AA.
- Noto Serif Display for headlines of 28 px and up, Source Serif 4 for reading, Noto Sans for interface. Self-hosted, Latin and Greek subsets only.
- Flat cards, 12 px radius, 1 px Apricot hairline. No shadows, gradients or glass, except a blur behind the sticky header. The arch mask only on her portrait and book covers.
- One 400 ms fade with a 12 px rise per section, honouring reduced motion. Hover is a color shift or underline. Nothing loops.
- Real photography in a few fixed ratios. No stock or generated images.
- Every empty, loading, error and offline state is designed. Phones first.

## 10. SEO

- One canonical per page, absolute. Reciprocal `hreflang` pairs (`en`, `el`, `x-default`) on every page that has both languages.
- Titles and descriptions per page and language from the studio, with defaults from site settings. Open Graph and Twitter cards with absolute image URLs.
- `sitemap.xml` generated from published pages and collections, listing a Greek URL only when the Greek is approved. `robots.txt` generated from site settings.
- JSON-LD: `Person` for Anastasia, `Book` for books, `Article` for posts, `Organization` for the foundation, `BreadcrumbList` on inner pages.

## 11. Phases and gates

Every phase ends with a gate run that passes in English and Greek, and with something that opens on a Cloudflare preview once hosting is connected. `bun run gate` = typecheck, lint, Cloudflare build, secrets check, Playwright (and from phase 4, Lighthouse and axe).

**Phase 1. Groundwork and the new look**
- This brief; the current-state map.
- Cloudflare build, Playwright in the gate. (Done.)
- Runtime public config instead of `VITE_*`.
- Design system: `DESIGN.md`, tokens in `src/styles.css`, self-hosted subset fonts, legacy tokens renamed, primitives (button, link, field, card, badge, toast, skeletons, empty and error states).
- Route tree with the optional locale segment; site shell (header, footer, language switch, skip link, 404, error); SEO layer (canonical, hreflang, sitemap, robots).
- Exit: every existing page renders in the new shell and type, in both languages, with green gate.

**Phase 2. Page builder and studio**
- Migrations for settings, navigation, social links, pages, versions, previews, redirects, media, audit, translation stale tracking, `is_admin()` with `aal2`, removal of anonymous inserts.
- Section registry and every section in section 5, each with schema, component and form.
- Seed today's content into pages and sections; retire `site.ts`, `page_content` and the `start_page_*` and `foundation_settings` tables.
- Rebuild every public page on sections.
- Studio shell, dashboard, page builder, media library, translations queue, collections, site managers, two-factor sign-in, audit log, Cmd+K.
- Exit: nothing public is hard-coded; every studio flow in section 12 passes.

**Phase 3. Books, audio and payments**
- Audiobooks and the player; ebook gate, leads, download tokens; YouTube sync; Stripe Checkout for books and products with orders; donations; Resend emails with the outbox; integrations screen.
- Exit: purchase, donation, download and newsletter flows pass end to end against Stripe's mock server and a local mail catcher.

**Phase 4. Prove it and launch**
- The full end-to-end list in section 12, axe accessibility checks, Lighthouse 90+ mobile on key pages, Greek layout review.
- Production: back up the database, apply migrations, run seeds that never overwrite, set Cloudflare secrets, deploy, connect the domain, verify live.
- Exit: Joel opens the live site and the studio and everything works.

## 12. End-to-end tests

Each runs on a phone viewport and a desktop viewport, in English and Greek where the flow has text.

Public:
1. Every page renders from the CMS with one H1, correct `lang`, one canonical, reciprocal hreflang, no console errors.
2. Switching language keeps you on the same page, without a full reload, and the content changes language.
3. Audiobook player: play, pause, seek, next chapter, speed, keyboard control; the Greek site plays the Greek edition.
4. Ebook gate: validation messages, successful request, download works, the lead is stored, the email is sent.
5. Newsletter: subscribe, confirm by email, unsubscribe.
6. Contact: send a message, see it in the studio inbox, notification email sent.
7. Blog: index with category filter and pagination, post page, related posts.
8. Books: list and book page with formats and buy buttons.
9. Shop: product to Stripe Checkout (mock), webhook marks the order paid, success page and receipt.
10. Donation: one-off and monthly to Checkout (mock), webhook records it, thank-you state.
11. Videos and gallery variants render; embeds only from allowlisted providers.
12. Redirects from the studio work; unknown pages return a designed 404.
13. Reduced motion and dark mode render correctly; axe finds no serious issues.

Studio:
14. Sign-in requires two-factor; an `aal1` session cannot write, even by calling server functions directly.
15. First-admin bootstrap works once and never again.
16. Create a page (Greek twin appears), add, reorder, hide sections, change a variant, save draft, open the shareable preview, publish, see it live.
17. Restore an earlier version; the unsaved-changes warning and undo toast work.
18. Upload an image: it is resized to WebP, shows progress, retries after a forced failure, appears in the library at once, requires alt text in both languages before publishing, and shows on the public page after saving.
19. Navigation, footer, social links, settings, SEO fields and redirects change the public site.
20. Translations: draft with Gemini (mocked), approve, Greek appears publicly; edit the English and the item turns Stale.
21. Integrations: save a Stripe key (stored encrypted, shown masked), run the YouTube sync (mocked).
22. Collections: create, edit, publish and delete for blog, books, audiobooks with chapter upload, products, masterclasses, stories, testimonials.
23. Orders, donations, subscribers and leads lists paginate and export.
24. Every action above appears in the audit log; Cmd+K finds pages and content.

## 13. What only Joel or Anastasia can provide

Needed before launch, not before building:
- GitHub: an empty private repository, connected to Claude.
- Supabase: access to project `extyqqkasmchctvoltbm` from the Supabase connector, so migrations can be applied and the live schema checked.
- Cloudflare: an account connected to the GitHub repository (Workers Builds), worker secrets set, and the domain `anastasiapatience.com`.
- The cloud environment allowing `*.supabase.co` and `*.workers.dev`.
- In the studio after launch: Stripe, YouTube, Resend and Gemini keys; Resend needs the sending domain verified.
- Content: the audiobook audio files (English and Greek), the ebook files, the Greek edition's details, any new photography, legal details for the privacy, terms and refund pages, and whether the foundation is a registered charity (this decides the donation wording and receipts).
