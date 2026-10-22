# Smoke checklist — Anastasia Heartfelt Journey

Run after `bun run gate` (or any deploy). Mark pass/fail with date.

**Env:** local preview / Netlify deploy preview / prod  
**Build:** `NITRO_PRESET=netlify bun run build` when testing ship shape  
**Domain:** until prod URL is set, absolute OG/sitemap may still be localhost — note it

## Automated (required)

| Check                 | Command                 | Pass? |
| --------------------- | ----------------------- | ----- |
| Typecheck             | `bun run typecheck`     |       |
| Lint                  | `bun run lint`          |       |
| Build                 | `bun run build`         |       |
| Secrets not in client | `bun run secrets:check` |       |
| Full gate             | `bun run gate`          |       |

## Public EN

| Path                               | Expect                                                  | Pass? |
| ---------------------------------- | ------------------------------------------------------- | ----- |
| `/`                                | Home renders, header/footer, no console crash           |       |
| `/books`                           | List shows CMS books (FYRTS + Turning Pain if seeded)   |       |
| `/books/find-your-reason-to-smile` | Book detail, cover, no blank shell                      |       |
| `/blog`                            | Index or designed empty                                 |       |
| `/gallery`                         | Grid or designed empty                                  |       |
| `/contact`                         | Form visible                                            |       |
| `/start`                           | Start page, bare chrome OK                              |       |
| `/sitemap.xml`                     | XML 200, urls present                                   |       |
| `/robots.txt`                      | Allows; Sitemap URL notes localhost until domain freeze |       |

## Public EL

| Path                                  | Expect                 | Pass? |
| ------------------------------------- | ---------------------- | ----- |
| `/el`                                 | Greek chrome/copy      |       |
| `/el/books`                           | Parity with EN list    |       |
| `/el/books/find-your-reason-to-smile` | Detail + hreflang sane |       |
| `/el/blog`                            | Parity                 |       |
| `/el/contact`                         | Form                   |       |
| `/el/start`                           | Start                  |       |

## Admin / trust

| Path                    | Expect                                     | Pass? |
| ----------------------- | ------------------------------------------ | ----- |
| `/auth`                 | Login UI                                   |       |
| `/admin`                | Redirect to auth if logged out             |       |
| `/admin/books` (authed) | List + add/delete; no public header chrome |       |
| Contact submit          | Success/error toast; row or email path     |       |
| Newsletter              | Subscribe path no 500                      |       |
| `/unsubscribe`          | Page loads                                 |       |

## Secrets / headers (spot)

| Check                                            | Pass? |
| ------------------------------------------------ | ----- |
| View-source / Network: no service role key in JS |       |
| Response not dumping `GEMINI_API_KEY`            |       |

## Sign-off

- Date:
- Runner:
- Deploy URL:
- Ship/no-ship:
- Notes:
