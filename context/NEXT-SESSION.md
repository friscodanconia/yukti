# Next Session Instructions

## Context
Read these files first:
1. `context/SESSION-SUMMARY.md` — full project history and current state
2. `context/DESIGN-DECISIONS.md` — why things are the way they are
3. `src/llm/prompt.ts` — the system prompt (most important file)
4. `src/toolkit/base-css.ts` — the CSS design system
5. `README.md` — project overview

## Paper MCP
Paper (paper.design) was added as an MCP server for design work:
```
claude mcp add paper --transport http http://127.0.0.1:29979/mcp --scope user
```
Make sure Paper desktop app is running before starting the session.
Use Paper to:
- Design better output components (sliders, output cards, result banners, tables)
- Create visual mockups of what the generated tool output should look like
- Iterate on the CSS design system in base-css.ts

## Priority tasks

### P0: Output design quality
The user rates current CSS a 2/10. The design was ported from Vaani but output still looks plain.
Key problems:
- Generated tools look like "white blobs" — not enough visual hierarchy
- Sliders, output cards, tables need more visual richness
- The warm cream palette from Vaani is in place but components need refinement
- Use Paper MCP to design premium components

### P1: End-to-end testing
Test these core flows on the deployed version (https://yukti.soumyosinha.workers.dev):
- Generate a tool → verify sliders work
- Save → verify it appears in My Tools
- Share → verify the URL works in incognito
- Refine → verify the tool updates
- Refresh → verify live data updates
- Fork from My Tools → verify regeneration
- Test on mobile (390px) — verify layout, back button, save/share

### P2: Recurring bugs
- Backtick nesting: LLM uses template literals inside HTML string. `fixNestedBackticks()` handles most cases but not all. May need a more robust parser.
- Analytics counters not incrementing in KV
- Some queries produce static (non-interactive) output despite prompt instructions

### P3: Uncommitted changes
There are changes since the last git commit. Commit before starting new work:
```bash
cd ~/Documents/playground
git add -A && git status
# Review, then commit
```

## How to run locally
```bash
cd ~/Documents/playground
npx vite dev --port 8787
# Open http://localhost:8787
```
Note: HMR is disabled (vite.config.ts) to prevent page reloads during generation.

## How to deploy
```bash
cd ~/Documents/playground
npx vite build && npx wrangler deploy
```

## Key URLs
- Live: https://yukti.soumyosinha.workers.dev
- Stats: https://yukti.soumyosinha.workers.dev/api/stats
- Test page: https://yukti.soumyosinha.workers.dev/api/test
- GitHub: https://github.com/friscodanconia/yukti
