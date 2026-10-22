# Phase 1 — Admin UI polish (frontend)

**Owner:** frontend-lead  
**Status:** complete  
**Verify:** `bun run typecheck` ✅

## Confirmed already true (no rebuild)

- Public chrome hidden on `/admin/**` + `/auth` + EN/EL `/start` (`__root.tsx`)
- Admin footer already quiet: `© year · Studio` + small public link
- Books admin: Add / Delete (confirm) / EmptyState / published|hidden / Greek panel
- Socials nav + dedicated route present

## Shipped this slice

1. **`PillButton` focus-visible** — soft burgundy ring + ivory offset (`admin/ui.tsx`) per design BUTTON_FOCUS_MAP
2. **Sidebar secondary chrome quieter** — View public / Sign out: drop loud uppercase tracking; normal-case `text-xs`, lighter hover, focus rings (`admin.tsx`)
3. **Books loading state** — polite “Loading books…” while list fetches; list/empty only after load

## Paths touched

- `src/components/admin/ui.tsx`
- `src/routes/_authenticated/admin.tsx`
- `src/routes/_authenticated/admin.books.tsx`

## Out of scope / residual

- No public redesign (P2 after north-star + screenshot accept)
- Manual smoke: login → `/admin/books` shows seed, Add → hidden, keyboard Tab on pills shows ring
- Purchase URLs still editor-filled
- Image weight = P3
