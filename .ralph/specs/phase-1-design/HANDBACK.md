# Phase 1 — Design handback

**Owner:** design-lead  
**Status:** complete  
**Next:** @frontend-lead (P1 admin only) · Phase 2 public elevation after verify gate

## Artifacts

| File                  | Purpose                                                     |
| --------------------- | ----------------------------------------------------------- |
| `/DESIGN.md`          | Agent-readable brand tokens + rules (lintable)              |
| `TOKEN_FREEZE.md`     | Name/value freeze; plum=charcoal, burgundy=coral            |
| `BUTTON_FOCUS_MAP.md` | Public Button vs admin PillButton vs utilities; focus rules |
| `NORTH_STAR.md`       | Advanced editorial bar + refs + P2 page order               |

## Decisions locked

1. **No public restyle in P1.**
2. **No mass-rename** of `plum`/`burgundy` CSS names — document meanings only.
3. **Dual button stacks stay** — align focus; don’t merge.
4. **Admin** = quieter studio; footer already quiet in code — FE only touch if regression.
5. **P2** = page-by-page from north-star priority list + screenshot accept with design.

## FE micro-asks (optional in P1)

- Add `focus-visible` soft burgundy ring on `PillButton` if missing.
- Refuse new hard-coded hex outside tokens.
- Books admin UI already complete per fullstack handback — no design blocker.

## Verify checklist (design P1)

- [x] Token freeze written
- [x] Button/focus map written
- [x] North-star + 5 reference bars
- [x] Root `DESIGN.md`
- [ ] `npx @google/design.md lint DESIGN.md` (run in handoff)
- [ ] @tech-lead marks design P1 done at phase gate

## Out of scope

Image compression (P3), SEO absolute URLs (orch), books glue (done), public implementation (P2).
