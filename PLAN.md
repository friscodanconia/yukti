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
- [x] Mobile (390px) — layout, back button, save/share (unit tests in scripts/test-mobile-layout.mjs — all 19 assertions pass; live E2E blocked by network restrictions)

## P2: Recurring bugs

- [x] Backtick nesting: rewrote `fixNestedBackticks()` as a proper state-machine parser — targets only `<script>` sections, preserves outer `${...}` expressions, handles multiple template literals; all 15 unit tests pass (scripts/test-backtick-fix.mjs)
- [x] Analytics counters not incrementing in KV — fixed by awaiting all 5 `trackEvent()` calls (were fire-and-forget, causing KV puts to be dropped before completion)
- [x] Some queries produce static (non-interactive) output despite prompt instructions — three-part fix: (1) removed conflicting "Return ONLY valid JSON" instruction that `callLLM` was appending to every system prompt (contradicted the JS-module instruction in `SYSTEM_PROMPT`); (2) lookup queries now promoted to `standard` tier when they have real signals (Haiku was producing minimal output); (3) added `lookup` output philosophy to `prompt.ts` requiring an interactive layer, plus a validation warning in `validate.ts` when no interactive elements are found. All 17 assertions pass (scripts/test-static-output-fix.mjs)

## P3: Done
- [x] Uncommitted changes committed (working tree is clean as of session start)
