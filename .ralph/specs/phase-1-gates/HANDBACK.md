# Phase 1 — Quality gates (perf-guardian)

**Owner:** @perf-guardian  
**Project:** Anastasia Heartfelt Journey  
**Status:** Landed 2026-08-23 — **gate GREEN**

## Scripts (`package.json`)

| Script                           | Purpose                                              |
| -------------------------------- | ---------------------------------------------------- |
| `bun run typecheck`              | `tsc --noEmit`                                       |
| `bun run lint`                   | ESLint (ignores node_modules/dist/.netlify/…)        |
| `bun run build`                  | Vite build (Lovable may default Nitro→Cloudflare)    |
| `bun run build:netlify`          | **`NITRO_PRESET=netlify vite build`** (ship shape)   |
| `bun run secrets:check`          | Scan `dist/` for server-only secrets                 |
| `bun run gate` / `bun run check` | **typecheck → lint → build:netlify → secrets:check** |

## Evidence (this machine)

```text
bun run typecheck  → exit 0
bun run lint       → exit 0 (11 react-refresh warnings only)
bun run build:netlify → exit 0
bun run secrets:check → PASS — 71 files under dist/; env value checks: SUPABASE_SERVICE_ROLE_KEY, ADMIN_SETUP_SECRET
bun run gate       → exit 0
```

## Reproduce

```bash
cd /Users/oel25h/Documents/Anastasia-Heartfelt-Journey
bun run gate
```

## Secrets-not-in-client

`scripts/check-secrets-not-in-client.mjs` fails if `dist/` contains:

- `sk_live_*` / `sk_test_*` / `sb_secret_*`
- `service_role` in JS bundles / JWT role claim shapes
- Exact values of `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SETUP_SECRET`, `GEMINI_API_KEY` when loaded (len ≥ 8)

Never prints secret values.

## Type / lint fixes included

1. `Messages` = deep string leaves (`en.ts`) so EL is not forced to English literal unions
2. `translate.functions.ts` — valid `SupabaseAdmin` type + safe `assertAdmin` rpc typing
3. `eslint.config.js` — ignore `node_modules`, `.netlify`, `.output`, `.wrangler`, etc. (was hanging on full-tree lint)
4. Prettier auto-fix on pre-existing src format errors so lint is fail-fast honest

## Smoke checklist

See `SMOKE.md` — manual until e2e (deferred).

## Residual

- **Prod domain** still TODO — robots/OG absolute (@it-orchestrator when @user provides URL)
- **No GitHub Actions yet** — local `bun run gate` is the bar
- **Image/CWV budgets** — Phase 3
- **11 react-refresh warnings** — non-blocking
- Bare `bun run build` may still emit Cloudflare worker artifacts; **ship/gate use `build:netlify`**
