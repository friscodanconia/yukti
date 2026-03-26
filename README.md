# Yukti

Ask a question, get a working interactive tool — not a chatbot reply.

Yukti uses Cloudflare Dynamic Workers to generate, sandbox, and serve custom interactive tools from natural language queries. Each tool is a unique piece of JavaScript code that runs in an isolated V8 sandbox, can fetch live data from 40+ public APIs, and renders as a self-contained interactive HTML page.

**Live:** https://yukti.soumyosinha.workers.dev

## How it works

```
User: "I earn 12L, how much tax do I pay?"
    ↓
Host Worker classifies query complexity
    ↓
LLM generates a Cloudflare Worker module (JavaScript)
    ↓
Code is validated (structure, safety, HTML presence)
    ↓
Fetch guard injected (blocks private networks)
    ↓
Dynamic Worker executes in V8 sandbox
  → fetches live data from approved APIs
  → computes results server-side
  → returns interactive HTML
    ↓
Host injects design system CSS
    ↓
User gets an interactive tool with sliders, charts, tables
```

## Architecture

```
src/
├── server.ts          # Host Worker — /api/explain, /api/refine, /api/rerun,
│                        /api/stats, /tool/{id}, capability selection, retry logic
├── client.tsx         # React frontend — home page, split view, pipeline animation,
│                        save/share/fork, inspector, refine bar, refresh
├── llm/
│   ├── prompt.ts      # System prompt — code gen instructions, 40+ API catalog,
│   │                    design rules, trust layer requirements
│   └── router.ts      # OpenRouter LLM call, complexity classifier
└── toolkit/
    ├── base-css.ts    # Design system CSS injected into every generated page
    ├── outbound.ts    # Fetch guard — blocks private networks, logs outbound
    └── validate.ts    # Code validation with structural + safety checks
```

## Key features

- **Arbitrary code generation** — the LLM writes real JavaScript, not templates
- **V8 sandbox isolation** — each tool runs in its own Cloudflare Worker isolate
- **40+ live data APIs** — stocks, weather, recipes, earthquakes, space, nutrition, more
- **Per-query capabilities** — only relevant API keys are passed to the sandbox
- **Save/share/fork** — tools persist in KV with shareable URLs
- **Refine** — modify existing tools with natural language ("add a GST column")
- **Live refresh** — re-execute same code for fresh API data, no LLM call
- **Inspector** — view generated code, timing, granted capabilities
- **Trust layer** — every tool shows data sources, freshness, assumptions
- **Analytics** — tracks generations, failures, success rates

## Setup

```bash
# Install dependencies
npm install

# Create .dev.vars with your API keys
echo 'OPENROUTER_API_KEY=sk-or-...' > .dev.vars
echo 'GOOGLE_API_KEY=AIza...' >> .dev.vars

# Start local dev server
npm start
# → http://localhost:5173
```

## Deploy to Cloudflare

```bash
# Create KV namespace
npx wrangler kv namespace create TOOLS_KV

# Set secrets
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put GOOGLE_API_KEY

# Build and deploy
npx vite build && npx wrangler deploy
```

## API catalog

The Dynamic Worker can fetch from any public API. The system prompt suggests these:

| Category | APIs |
|---|---|
| Finance | Yahoo Finance, Frankfurter, CoinGecko, mfapi.in |
| Weather | Open-Meteo (weather + AQI) |
| Food | TheMealDB, USDA Nutrition, TheCocktailDB |
| Movies/TV | OMDB, TVMaze |
| Books | Google Books, Open Library |
| Space | NASA APOD, ISS tracker, SpaceX, USGS earthquakes |
| Sports | OpenF1, TheSportsDB |
| India | data.gov.in commodities, PIN codes, IFSC codes |
| Reference | Wikipedia, Dictionary, World Bank |
| Google | Knowledge Graph, YouTube (via env key) |

## Model routing

| Complexity | Model | When |
|---|---|---|
| Fast | Claude 3.5 Haiku | Simple questions, basic tools |
| Standard | Claude Sonnet 4 | Comparisons, calculations, data queries |
| Powerful | Claude Opus 4 | Multi-step simulations, complex logic |

## Why Dynamic Workers

A regular API could call an LLM and return HTML. Dynamic Workers add:

1. **Sandbox isolation** — untrusted LLM-generated code runs in its own V8 isolate
2. **Server-side data fetching** — the Worker calls APIs before rendering, keeping keys and raw data off the client
3. **Per-request capability control** — each Worker gets only the env bindings it needs
4. **Network guardrails** — fetch guard blocks private network access
5. **Millisecond startup** — no container cold starts, runs on Cloudflare's edge globally
