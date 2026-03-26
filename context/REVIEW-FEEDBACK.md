# External Review Feedback

## Review 1 (Synthesis of two reviews)
**Score: 6.7/10 → Potential 8.5-9/10**

Key findings:
- Concept is strong and differentiated
- Biggest technical issue: unrestricted outbound access → ADDRESSED (fetch guard)
- Retention/stickiness weak → ADDRESSED (save/share/fork/My Tools)
- Prompt carries too much load → ACKNOWLEDGED (intentional for now)
- Need: saved tools, versioning, sharing, history, library → ADDRESSED
- Need: strict egress control, typed RPC, observability → PARTIALLY ADDRESSED

## Review 2 (LLM reviewer)
**Score: 8/10 (up from 6.5)**

What was added:
- Network security guard ✅
- Capabilities system ✅
- Tool persistence ✅
- My Tools library ✅
- Analytics ✅
- Refine mode ✅
- Refresh data ✅
- Code inspector ✅
- Capability badges ✅

Remaining gap: user accounts (tools in localStorage, not cloud)

## Review 3 (Expert reviewer)
**Score: 7.5/10**

Best improvements to make:
1. Trust layer (sources, freshness, assumptions) → ADDRESSED
2. Tighten sandbox policy → ADDRESSED (fetch guard, but not strict allowlist)
3. Improve generation QA (validation) → ADDRESSED (enhanced validate.ts)
4. Smarter model routing → ADDRESSED (Haiku/Sonnet/Opus tiers)
5. End-to-end tests → NOT DONE
6. Reduce "developer product" leakage → PARTIALLY (inspector hidden by default)
7. Onboarding/use-case framing → PARTIALLY (new copy, example categories)
8. README and deployment docs → DONE

## User feedback (throughout session)
- "This is a FUCKING WHITE BLOB SPACE" — output pages have no visual hierarchy, everything blends
- "The design output is amateurish" — rated CSS 2/10
- Mobile layout broken — left panel showing alongside result
- Sliders don't work — backtick nesting breaks generated JS
- Pre-selected queries sometimes don't trigger — form submission issues
- Pipeline animation had fake timings — removed, replaced with real elapsed timer
- Example queries too India-centric — mixed India + global
- Copy on home page was bad — improved to "What if every question had an answer beyond text?"
- Categories on home page looked like "white blobs" — added colored tints per category
- Left panel showing categories during result view — replaced with Recent Tools
- Yukti logo inconsistent across pages — made consistent serif treatment
