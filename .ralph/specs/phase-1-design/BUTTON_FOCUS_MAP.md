# Phase 1 — Button & focus map

**Owner:** design-lead  
**Implementers:** frontend-lead (align only; no public restyle in P1)  
**Status:** locked

## Two stacks (intentional)

| ID                   | Path                                                            | Consumers                                                       |
| -------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| **A. Public/shadcn** | `src/components/ui/button.tsx`                                  | Public pages, Radix wrappers (dialog/calendar/sidebar/carousel) |
| **B. Admin pills**   | `src/components/admin/ui.tsx` → `PillButton`, `ConfirmButton`   | All `/admin/**` forms, Socials, Greek panel, ImageUpload        |
| **C. CSS utilities** | `styles.css` → `btn-pill`, `btn-primary-pill`, `btn-ghost-pill` | Marketing sections that compose classes directly                |

Do **not** merge stacks in P1. Align behavior within each.

---

## Stack A — `Button` (public / shared)

| Variant       | Default                                              | Hover                                          | Focus-visible                            |
| ------------- | ---------------------------------------------------- | ---------------------------------------------- | ---------------------------------------- |
| `default`     | bg coral (`burgundy`), text ivory, soft coral shadow | bg charcoal, deeper shadow, `-translate-y-0.5` | ring 2 **gold** (`ring`), offset 2 ivory |
| `outline`     | border charcoal/15, transparent                      | border+text coral                              | same ring                                |
| `secondary`   | bg bone                                              | bone/70                                        | same ring                                |
| `ghost`       | transparent                                          | bg bone                                        | same ring                                |
| `link`        | text coral, underline offset                         | underline; **no** translate                    | same ring                                |
| `destructive` | destructive red                                      | /90                                            | same ring                                |

**Sizes:** `default` h-11; `sm` h-9; `lg` h-12 + uppercase tracking ~0.18em (marketing); `icon` 40².

**When to use:** public CTAs, shared primitives, anything outside admin form chrome.

---

## Stack B — `PillButton` (admin)

| Variant   | Default                               | Hover                      |
| --------- | ------------------------------------- | -------------------------- |
| `primary` | coral bg, ivory text, coral shadow    | terracotta bg, slight lift |
| `outline` | border plum/20                        | border plum, bg plum/5     |
| `ghost`   | text plum/70                          | text plum, bg plum/5       |
| `danger`  | border terracotta/40, text terracotta | bg terracotta/10           |

**Sizes:** `md` px-6 py-3 text-[11px] caps tracking 0.22em; `sm` tighter.

**Focus (gap to close in P1 if missing):** add `focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-burgundy/15 focus-visible:border-burgundy` to match `inputCls` — quieter than public gold ring.

**ConfirmButton:** two-step arm → label “Confirm?”; primary when armed; auto-disarm ~3.5s.

**When to use:** every admin save/add/generate/delete control.

---

## Stack C — utilities

| Utility            | Role                                                                          |
| ------------------ | ----------------------------------------------------------------------------- |
| `btn-pill`         | Base pill layout, caps 0.22em, hover lift                                     |
| `btn-primary-pill` | Coral → charcoal hover (matches public marketing, not admin terracotta hover) |
| `btn-ghost-pill`   | Ghost border → coral                                                          |

**Note:** primary-pill hover is **charcoal**; admin primary hover is **terracotta**. Keep both — public = dramatic ink, admin = warm studio.

---

## Focus system (site-wide)

| Surface                                   | Focus treatment                                                    |
| ----------------------------------------- | ------------------------------------------------------------------ |
| Public buttons                            | Gold ring + offset (ring token)                                    |
| Admin fields (`inputCls` / `textareaCls`) | Coral border + `ring-4 ring-burgundy/10`                           |
| Admin pills                               | Align to field focus (burgundy soft ring) — FE micro-fix if absent |
| Header nav                                | Color → burgundy + underline bar; skip link = solid burgundy chip  |
| Admin drawer                              | Escape closes; backdrop click closes; restore scroll               |
| Modals (Radix)                            | Keep shadcn focus trap defaults                                    |

**Ship rule:** no `outline-none` without a visible `focus-visible` replacement.

---

## CTA hierarchy

1. **Primary** — one solid coral per cluster (Buy / Subscribe / Save).
2. **Secondary** — outline or ghost (Learn more / Cancel).
3. **Tertiary** — text link coral or plum/60.
4. **Danger** — outline terracotta + confirm pattern in admin.

---

## P1 FE acceptance (minimal code)

- [ ] Admin polish uses `PillButton` only (no new raw `<button className=bg-…">` coral one-offs).
- [ ] Public pages unchanged unless bugfix.
- [ ] Optional: add focus-visible ring to `PillButton` base class.
- [ ] Optional: admin footer already quiet — leave; don’t re-uppercase.
