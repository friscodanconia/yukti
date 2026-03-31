# Yukti — Task Plan

## P0: Output design quality
> User rates current CSS 2/10. Output pages look like "white blobs" with no visual hierarchy.

- [ ] Strengthen CSS visual hierarchy (borders, shadows, card depth) in `base-css.ts`
- [ ] Inject base slider-fill script in `validate.ts` so ALL sliders auto-show fill position
- [ ] Add slider fill update guidance to `prompt.ts`

## P1: End-to-end testing
> Verify core flows on https://yukti.soumyosinha.workers.dev

- [ ] Generate a tool → verify sliders work
- [ ] Save → verify it appears in My Tools
- [ ] Share → verify the URL works in incognito
- [ ] Refine → verify the tool updates
- [ ] Refresh → verify live data updates
- [ ] Fork from My Tools → verify regeneration
- [ ] Mobile (390px) — layout, back button, save/share

## P2: Recurring bugs

- [ ] Backtick nesting: improve `fixNestedBackticks()` or add a more robust parser
- [ ] Analytics counters not incrementing in KV
- [ ] Some queries produce static (non-interactive) output despite prompt instructions

## P3: Done
- [x] Uncommitted changes committed (working tree is clean as of session start)
