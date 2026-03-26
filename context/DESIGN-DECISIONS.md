# Design Decisions Log

## Why arbitrary code, not templates
The LLM generates real JavaScript Worker code, not JSON that maps to pre-built components. This was a deliberate choice:
- Templates limit output to what you pre-built (14 component types)
- Arbitrary code can produce anything — sorting visualizations, interactive maps, custom calculators
- The Dynamic Worker sandbox is only needed for arbitrary code (templates don't need sandboxing)
- Tradeoff: output quality varies, some tools break. But the ceiling is infinitely higher.

## Why open outbound, not strict allowlist
The fetch guard blocks private networks (localhost, 10.x, 192.168.x) but allows all public APIs.
- A strict allowlist broke queries where the LLM wanted to call an API we didn't anticipate
- For a consumer product, "why can't it answer my question?" is worse than theoretical security risk from a public API call
- The prompt suggests 40+ APIs but doesn't restrict to only those
- Production v2: use a proper Fetcher service binding for domain filtering

## Why Vaani's design language
User explicitly requested matching vaani.soumyosinha.com aesthetic:
- Warm cream palette (#f5ede0 surface, #faf6ef raised, #c2652a accent)
- Glass-card containers with semi-transparent borders
- Outfit font family
- Terracotta accent color
- Dark (#1c1917) for highlight cards and result banners

## Why no user accounts (yet)
- "Deploy first, accounts later" — ship it, see if people use it
- Tools saved to localStorage (per-device) + KV (shareable URLs, 7 day expiry)
- Accounts become obvious if there are repeat visitors who want cross-device persistence

## Why the LLM prompt is so long
The prompt (~3000 tokens) carries most of the product logic:
- What APIs to call and how
- What CSS classes to use
- Design rules (use .card, use .result-banner, no emoji)
- Trust layer requirements (sources, assumptions, limitations)
- Code quality rules (no backticks inside HTML, use string concatenation)
This is intentional — the prompt IS the product. Moving it to code just moves the complexity.

## Why HMR is disabled
Vite's Hot Module Replacement was causing full page reloads during the 15-25 second LLM generation. The page would reload mid-request, losing the result. Disabled in vite.config.ts.

## Why sandbox="allow-scripts" only (no allow-same-origin)
Adding allow-same-origin let the iframe's generated code escape and reload the parent page. With just allow-scripts, the generated code runs but can't affect the parent.
