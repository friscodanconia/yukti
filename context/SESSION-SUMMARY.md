# Yukti — Session Summary

## What is Yukti
An interactive tool generator powered by Cloudflare Dynamic Workers. Users ask a question ("How much tax on 12L salary?") and get a custom interactive tool (calculator, comparison, simulator) built on the fly — not a chatbot reply.

**Live:** https://yukti.soumyosinha.workers.dev
**Repo:** https://github.com/friscodanconia/yukti

## How it started
- User read a Cloudflare blog post about Dynamic Workers (sandboxed V8 isolates for running AI-generated code)
- We explored what to build that genuinely uses this capability
- Landed on: LLM writes real JavaScript code → runs in sandbox → fetches live data from APIs → returns interactive HTML

## Architecture evolution

### v1 (template system — deleted)
- LLM picked from 14 pre-built component types (calculator, step-flow, chart, etc.)
- Fixed renderer turned JSON into HTML
- Dynamic Worker just served static HTML — didn't need sandboxing at all
- **Deleted because:** it was a template engine, not a Dynamic Workers showcase

### v2 (current — arbitrary code generation)
- LLM writes a complete Cloudflare Worker module (JavaScript)
- The Worker can fetch live data from 40+ public APIs
- Dynamic Worker executes in a V8 sandbox with:
  - Fetch guard (blocks private networks)
  - Per-query capability selection (only relevant API keys per sandbox)
  - Base CSS auto-injected by host
- Results saved to KV with shareable URLs

## Key files
```
src/
├── server.ts          # Host Worker — /api/explain, /api/refine, /api/rerun, /api/stats, /tool/{id}
├── client.tsx         # React frontend — home page, split view, pipeline animation, save/share/fork, inspector, refine bar
├── llm/
│   ├── prompt.ts      # System prompt — THE most important file. Code gen instructions, 40+ API catalog, design rules, trust layer
│   └── router.ts      # OpenRouter LLM call, complexity classifier (fast=Haiku, standard=Sonnet, powerful=Opus)
└── toolkit/
    ├── base-css.ts    # Design system CSS injected into every generated page (currently ported from Vaani)
    ├── outbound.ts    # Fetch guard — blocks private networks, logs outbound
    └── validate.ts    # Code validation with structural + safety checks
```

## What was implemented (from review feedback)

### Tier 1 (done)
- ✅ Outbound lockdown — fetch guard blocks private networks
- ✅ Per-query capability selection — only relevant env bindings per sandbox
- ✅ Run IDs + timing breakdown — visible in inspector
- ✅ Save/share/rerun/fork — localStorage + KV, shareable URLs, My Tools on home page

### Tier 2 (done)
- ✅ Refinement controls — "Refine this tool" bar at bottom of result
- ✅ Analytics — tracks generations, refines, failures to KV, /api/stats endpoint
- ⏭️ Skipped: structured result contracts + host-render archetypes (conflicts with arbitrary code architecture)

### Tier 3 (done)
- ✅ Per-query capability selection — host classifies query, passes relevant env bindings
- ✅ Inspector panel — shows generated code, timing, capabilities
- ✅ Live refresh — re-execute same code for fresh API data, no LLM call
- ⏭️ Skipped: versioned prompt system (premature)
- 🔶 Partial: Tail Worker logs (needs production Durable Objects)

## Current design state
- CSS ported from Vaani (vaani.soumyosinha.com): warm cream palette, glass-card containers, terracotta accent
- Background: #f5ede0, Cards: #faf6ef, Accent: #c2652a, Dark highlight: #1c1917
- Font: Outfit (body) from Vaani
- **User rates current output design: needs improvement** — wants Paper MCP tool to help refine

## Known issues
1. **Backtick nesting** — LLM sometimes uses template literals inside the HTML string, causing syntax errors. `fixNestedBackticks()` in server.ts auto-fixes most cases but not all.
2. **Analytics counters** — not incrementing in production (KV write timing issue)
3. **Output quality varies** — some queries produce static tables instead of interactive tools. Prompt has instructions to force interactivity but LLM doesn't always comply.
4. **Sliders occasionally don't work** — usually caused by a JS error in the generated code that prevents the update function from running.

## What to do next
1. **Use Paper MCP** to improve output design quality — this was the reason for ending the session
2. **End-to-end testing** — run a batch of queries and verify all flows work
3. **Mobile QA** — full pass at 390px
4. **Medium + Fun APIs** — test recipes, movies, earthquakes, trivia, NASA queries
5. **Commit latest changes** — there are uncommitted changes from the CSS redesign and bug fixes

## API keys (in .dev.vars and Cloudflare secrets)
- OPENROUTER_API_KEY — for LLM calls via OpenRouter
- GOOGLE_API_KEY — for Knowledge Graph + YouTube APIs

## Deploy command
```bash
cd ~/Documents/playground
npx vite build && npx wrangler deploy
```

## Review scores
- Initial: 6.7/10
- After Tier 1-3: 8/10
- Current gap: output design quality, trust/reliability polish
