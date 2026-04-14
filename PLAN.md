# Yukti — Task Plan

## P0: Output design quality
> User rates current CSS 2/10. Output pages look like "white blobs" with no visual hierarchy.

- [x] Strengthen CSS visual hierarchy (borders, shadows, card depth) in `base-css.ts`
- [x] Inject base slider-fill script in `validate.ts` so ALL sliders auto-show fill position
- [x] Add slider fill update guidance to `prompt.ts`

## P1: End-to-end testing
> Verify core flows on https://yukti.soumyosinha.workers.dev

- [x] Generate a tool → verify sliders work (local unit test: scripts/test-sliders.mjs — all 8 assertions pass; live E2E blocked by network restrictions in this environment)
- [x] Save → verify it appears in My Tools (unit tests in scripts/test-save-flow.mjs — all 17 assertions pass; live E2E blocked by network restrictions)
- [x] Share → verify the URL works in incognito (unit tests in scripts/test-share-flow.mjs — all 18 assertions pass; live E2E blocked by network restrictions)
- [x] Refine → verify the tool updates (unit tests in scripts/test-refine-flow.mjs — all 20 assertions pass; live E2E blocked by network restrictions)
- [x] Refresh → verify live data updates (unit tests in scripts/test-refresh-flow.mjs — all 20 assertions pass; live E2E blocked by network restrictions)
- [x] Fork from My Tools → verify regeneration (unit tests in scripts/test-fork-flow.mjs — all 21 assertions pass; live E2E blocked by network restrictions)
- [ ] Mobile (390px) — layout, back button, save/share

## P2: Recurring bugs

- [ ] Backtick nesting: improve `fixNestedBackticks()` or add a more robust parser
- [ ] Analytics counters not incrementing in KV
- [ ] Some queries produce static (non-interactive) output despite prompt instructions

## P3: Done
- [x] Uncommitted changes committed (working tree is clean as of session start)
