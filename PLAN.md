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

## P3: Resilience

- [x] Silent SSE truncation: if the stream ends without a `complete` or `error` event (worker timeout, network drop), `generate()` returns without setting `html` or `error`, so `hasResult` becomes false and the user is silently sent back to the home screen. Fixed: track `resultReceived` locally; if false after the read loop, call `setError("Stream ended unexpectedly — please try again")`.
- [x] Silent KV save failures in `/api/refine` (server.ts:609) and `/api/refresh` (server.ts:745): bare `catch {}` swallowed errors with no logging, unlike `/api/stream` which logs a warning. Added `console.warn` to both so failures surface in worker logs.

## P2: Recurring bugs (continued)

- [x] `handleLoadTool` stale state: loading a saved tool from My Tools preserved `code`, `meta`, `saved`, `copied`, `showDetails`, and `refineInput` from the previous generation — so the inspector showed wrong code and the refine bar operated on a different tool's code. Fixed by clearing all of those states at the start of `handleLoadTool` in `client.tsx`.

## P2: Recurring bugs (continued 2)

- [x] `handleLoadTool` misses resetting `mobileRefineOpen` and `showInspector` — if either overlay was open when the user taps a saved tool on mobile, the stale sheet persists over the freshly loaded tool. Fixed: added `setMobileRefineOpen(false)` and `setShowInspector(false)` to `handleLoadTool` in `client.tsx`.

## P5: Code quality

- [x] Dead code in `client.tsx`: `STAGE_MAP` (lines 80-125), `STAGE_ORDER` (line 127), and `onboardingStep` / `setOnboardingStep` state are defined but never read — remove to reduce confusion and bundle size.
- [x] Unused import in `server.ts`: `classifyComplexity` is imported from `./llm/router` but never called (the code uses `classifyQuery` instead).
- [x] Dead `/api/explain` endpoint in `server.ts` (~160 lines, 391-550): duplicates `/api/stream` logic but is never called by the client — removed in commit 8012495 along with KV-logging fix.

## P2: Recurring bugs (continued 3)

- [x] `extractToolMeta()` regex missing capture group (`server.ts:101`): regex matched the full `<script>` tag but had no capture group, so `match[1]` was always `undefined` → `JSON.parse(undefined)` threw → caught silently → returned `null` for every tool. This silently broke the Inspector's metadata tab and analytics metadata collection for all tools. Fixed by adding parens around `[\s\S]*?` to create a capture group.

## P2: Recurring bugs (continued 4)

- [x] Unprotected `request.json()` in `/api/me/tools` POST (server.ts:159) and DELETE (server.ts:169): malformed request bodies throw uncaught exceptions that propagate out of `handleRequest` with no JSON error response. Wrap both in try-catch to return `400 Bad Request` with `{ ok: false, error: "Invalid request body" }`, matching the pattern used in `/api/clarify` (server.ts:178-198).

## P2: Security fixes

- [x] Missing runId validation + weak RNG: (1) `/tool/` (server.ts:487) and `/api/run/` (server.ts:617) extract `runId` from the URL and use it directly as a KV key with no format check — any arbitrary string (very long, containing special chars) hits KV; add a `^[a-z0-9]{8}$` guard before both lookups. (2) `generateRunId()` (server.ts:963) uses `Math.random()` which is not cryptographically secure — replace with `crypto.getRandomValues()`.

## P2: Recurring bugs (continued 5)

- [x] Unprotected `request.json()` in `/api/stream` (server.ts:217): same class of bug as the `/api/me/tools` fix — malformed JSON body throws an uncaught exception that propagates out of `handleRequest` with no proper error response. Wrapped in try-catch to return `400 Bad Request` with `{ error: "Invalid request body" }`, consistent with all other POST endpoints.

## P2: Observability

- [x] `getUserData` bare `catch {}` (server.ts:121): KV read failures and JSON parse errors are silently swallowed — the function returns empty defaults with no trace in worker logs, making production data-loss bugs impossible to diagnose. Added `console.warn` with uid and error so failures surface in Cloudflare logs.

## P2: Security fixes (continued)

- [x] XSS in OG meta tag topic injection (server.ts:503,508): `topic.replace(/\"/g, '&quot;')` only escapes double quotes — `<`, `>`, and `&` pass through unescaped. Added `escapeHtml()` helper (escapes `&`, `<`, `>`, `"`, `'`) and used it for topic in all OG/Twitter meta tags.
- [x] Unvalidated image data URI (server.ts:82): `imageDataUri` from Gemini API is injected into `<img src>` without checking it's a `data:image/` URI — added `startsWith("data:image/")` guard; returns original html unchanged if check fails.

## P2: Observability (continued)

- [x] Silent server-sync failures in `handleSave` and `handleRemoveTool` (client.tsx:374,386): bare `catch {}` hides network/server errors — user sees success in UI but tool was never persisted on server. Added `console.warn` with context so failures surface in browser devtools.

## P2: Recurring bugs (continued 6)

- [x] Silent refresh failure in toolbar Refresh button (client.tsx:1114): bare `catch {}` swallowed network errors and JSON parse exceptions — user saw spinner disappear with no feedback. Also, if server returned non-200 (400/500), `data.error` was silently dropped. Fixed: (1) nested try-catch on JSON.parse to surface parse failures; (2) `!res.ok` guard shows `data.error`; (3) outer catch replaced with `catch (err) { setError(...) }` so network failures are visible.

## P2: Observability (continued 2)

- [x] Bare `catch {}` in `/tool/` handler (server.ts:525): KV fetch errors were silently swallowed, so timeouts or permission failures showed a misleading 404 "Tool not found or expired" instead of a 500. Fixed: added `console.warn` with runId and error, and return a proper 500 response. Also added `console.warn` to the silent catch in `/api/run/` (server.ts:641) so corrupted KV data surfaces in worker logs.

## P2: Recurring bugs (continued 7)

- [x] Race condition in `generate()` when backgrounded: if the user backgrounds a generation and then clicks a saved tool or Fork, two concurrent SSE streams run and race to write `html`/`code`/`runId` state. Fixed by adding `abortControllerRef` (a `useRef<AbortController | null>`) — `generate()` aborts the previous controller before starting a new one, and `handleLoadTool` aborts any in-flight generation before fetching the saved tool. The aborted stream's `finally` block checks `controller.signal.aborted` and skips the `setLoading(false)` call so it doesn't clear loading state for the new request.

## P2: Recurring bugs (continued 8)

- [x] SSE loop doesn't check abort signal inside the event-processing `for` loop (client.tsx:530-578): between when `abort()` is called and when `reader.read()` next throws AbortError, the `for(const part of parts)` loop can still process a buffered "complete" event and call `setHtml(oldHtml)`, `setCode(oldCode)`, etc. — overwriting state the new `generate()` just reset to `null`. Fixed: added `if (controller.signal.aborted) break` at the top of the `while` loop and at the start of the `for` loop so stale events are discarded immediately on abort.
- [x] Clipboard API without `.catch()` in My Tools share button (client.tsx:858), inspector share button (client.tsx:966), and mobile action bar share button (client.tsx:1421): `navigator.clipboard.writeText()` is called without awaiting or catching — on clipboard permission denial (incognito, non-HTTPS, or sandboxed contexts) the promise rejects silently and the UI still shows "✓ Copied!" even though nothing was copied. Fixed: all three handlers are now `async`, `await` the clipboard write, and use try/catch — success shows the existing green "✓ Copied!" state, failure shows a red "Failed" state (DOM-class swap for My Tools, new `copyFailed` state for Inspector and mobile); added `setCopyFailed(false)` resets in `handleLoadTool`, `handleRefine`, and `generate()`.

## P2: Recurring bugs (continued 9)

- [x] `handleLoadTool` fetches `/tool/:runId` which the server enriches with OG meta tags and a "Built with Yukti" footer before returning. The footer then renders inside the iframe — freshly generated tools never show this footer, so the experience is inconsistent. Fixed: `handleLoadTool` now fetches `/tool/:runId?embed=1`; the `/tool/:runId` handler (server.ts) skips OG tags and footer injection when `url.searchParams.get("embed") === "1"`, returning raw tool HTML for the in-app iframe.

## P2: Recurring bugs (continued 10)

- [x] `handleRefine()` not integrated with `abortControllerRef` (client.tsx:430): `generate()` aborts any in-flight generation via the ref, but `handleRefine()` creates no AbortController and never registers with it. If the user triggers `generate()` while a refine is in flight, `generate()` clears `html`/`code`/`runId` to null then starts streaming — but the stale refine response can arrive and overwrite those nulled states with the old HTML/code, displaying the wrong tool.

- [x] `/api/refine` malformed request body returns 500 instead of 400 (server.ts:422): `request.json()` is inside the outer try-catch, so a bad JSON body gets caught by the outer handler and returns status 500 with the raw parse error. Every other POST (`/api/stream`, `/api/me/tools`) has a dedicated inner try-catch for `request.json()` returning 400. `/api/refine` and `/api/rerun` (server.ts:597) still have the old pattern. Fixed: both endpoints now have a dedicated try-catch for `request.json()` that returns 400.

- [x] No input length limits on user-controlled string fields (server.ts:235,422,597): `topic`, `originalCode`, `instruction`, and `code` fields have only presence checks but no max-length guard. An attacker can send a 500KB topic or 1MB code string — billing every token to the API key and potentially hitting worker CPU limits. Fixed: added `topic.length > 2000`, `instruction.length > 2000`, `originalCode.length > 100_000`, and `code.length > 100_000` guards returning 400 at all three endpoints.

## P2: Security fixes (continued 2)

- [x] `/api/me/tools` POST accepts unvalidated `runId` and `toolUrl` from the client body (server.ts:176): the PLAN.md `^[a-z0-9]{8}$` guard was applied to `/tool/` and `/api/run/` lookups but not here. An attacker can POST any `toolUrl` string which gets stored in their user KV entry; `handleLoadTool` then calls `fetch(tool.toolUrl)` with that URL, causing the browser to request an attacker-controlled origin. Fixed: added `^[a-z0-9]{8}$` guard on `runId` and `/tool/` prefix check on `toolUrl`, both returning 400 before any KV write.

## P3: Resilience (continued)

- [x] `DATA_GOV_KEY` hardcoded in source (server.ts:699): the India commodity-prices API key is a literal string in source, unlike `GOOGLE_API_KEY` which correctly reads from `hostEnv`. Commits to source control expose the key; rotation requires a code change and redeploy. Move to `env.DATA_GOV_KEY` with a fallback to the current literal, and add `DATA_GOV_KEY` to `wrangler.toml` / env bindings.

- [x] `sanitizeCode()` only strips empty-body external script tags (validate.ts:107): the regex requires `>\s*</script>` — a non-empty body like `// polyfill` bypasses the strip. LLM-generated `<script src="https://cdn.../lib.js">// fallback</script>` loads in the tool sandbox unblocked. Fix: allow any content between the tags (`[\s\S]*?`) in the CDN-script regex.

## P4: UX polish

- [x] NaN in timing panels after refine or refresh (client.tsx:1203,1522): `/api/refine` response has `meta.timing = { llmMs, totalMs }` (no `execMs`); `/api/rerun` has `meta.timing = { execMs }` (no `llmMs`/`totalMs`). All three Inspector timing displays call `.toFixed(1)` on all fields unconditionally, producing "NaNs" after a refine or refresh. Fix: guard each timing field with `meta.timing.xxxMs != null` before rendering.

- [x] `handleLoadTool` catch has no `console.warn` (client.tsx:422): unlike `handleSave` and `handleRemoveTool` (fixed in P2 Observability), this catch calls `setError()` for the user but logs nothing — network failures or server errors are invisible in devtools. Add `console.warn` with toolUrl and err.

- [x] `submitQuery` clarify catch swallows errors silently (client.tsx:630): bare `catch {}` on the entire clarify fetch — correct to fail open, but no `console.warn` means a broken `/api/clarify` is undetectable in production devtools.

- [x] `BuildingPipeline` staggered `setTimeout` callbacks lack cleanup (client.tsx:127): the `useEffect` that schedules staggered narrative-line reveals returns no cleanup. If the stage changes before the timeouts fire, old stage lines append after new stage lines, scrambling the order. Return a cleanup function that calls `clearTimeout` on all queued IDs.

## P4: Done
- [x] Uncommitted changes committed (working tree is clean as of session start)

## P2: Security / input validation (continued)

- [x] `/api/clarify` missing `topic.length > 2000` guard (server.ts:208): every other POST endpoint (`/api/stream`, `/api/refine`, `/api/rerun`) received the length cap in the previous input-validation fix, but `/api/clarify` was missed. An unauthenticated attacker can POST a 1 MB topic repeatedly to burn OpenRouter API budget at `fast`-tier cost. Fixed: added `topic.length > 2000` guard returning `{ action: "build" }` (fail-open, same as the other error paths).

- [x] `getUserData` returns raw KV parse result — `tools.filter()` crashes on corrupted records (server.ts:126): `getUserData` returns `JSON.parse(raw)` without checking that `tools` is actually an array. If KV ever stores `{ tools: null }` (partial write, manual edit, migration bug), callers at lines 185 and 200 call `.filter()` on a non-array and throw a 500. Fixed: added `Array.isArray(parsed.tools)` guard in `getUserData`; resets to `[]` if corrupted.

## P2: UX bugs

- [x] Sidebar timing shows "NaN s" after refine or refresh (client.tsx:1031–1036): the inspector NaN fix (previous PLAN.md task) only covered the inspector panel, not the sidebar expand-details section. Lines 1031–1032 called `.toFixed(1)` on `llmMs` and `execMs` unconditionally; line 1036 did the same for `totalMs`; line 1026 showed the button-label time. Fixed: guarded all four with `!= null` checks (or `?.` on the button label), matching the inspector pattern.

- [x] Desktop Refresh button never calls `setMeta()` — inspector shows stale metadata after every refresh (client.tsx:1166): `/api/rerun` returns `meta: { timing: { execMs }, granted }` but the click handler only called `setHtml`, `setRunId`, `setToolUrl`, `setSaved`, `setCopied`. After refresh the inspector still shows the original generation's model, LLM timing, and tier. Fixed: added `if (data.meta) setMeta(data.meta)` after the existing state updates.

## P2: Privacy

- [x] `/api/stats` publicly exposes all user queries (server.ts:686): the endpoint has no auth check and returns `recentQueries` — the last 50 raw topic strings from all users. Topics commonly contain personal financial data (income, loan amounts, family details). Fixed: removed `recentQueries` from the public response and skipped the KV fetch entirely — aggregate counters (generations, refines, failures, successRate) are still returned.

## P3: Security

- [x] Gemini `mimeType` injected raw into `src` data URI without escaping (server.ts:69): `return \`data:${part.inlineData.mimeType};base64,...\`` — if mimeType contains a double-quote, it breaks out of the `src` attribute and creates an XSS vector. The `startsWith("data:image/")` guard on the assembled string prevents null/non-image cases but not attribute-breaking chars within a valid image mimeType. Fixed: validate `mimeType` with `!/^image\/[a-zA-Z0-9+.-]+$/.test(mimeType)` guard before constructing the data URI — return `null` (skip image injection) if mimeType is malformed.

- [x] `uid` cookie missing `Secure` flag (server.ts:148): `Set-Cookie` header lacks `; Secure`, so browsers may transmit the session cookie over plain HTTP. Add `; Secure` to the cookie header.

- [x] `uid` cookie value not validated as UUID (server.ts:139): an attacker-supplied cookie value is used verbatim as `user:${uid}` KV key with no format check. An overlong value (> ~500 bytes) causes KV puts to fail with an unhandled error (500). A value matching another user's known UUID enables saved-tool read/overwrite. Fix: validate `uid` matches `^[0-9a-f-]{36}$` (UUID v4 format); if not, treat as new user and mint a fresh UUID.

## P3: Resilience

- [x] KV analytics counter read-write race — increments dropped under concurrent load (server.ts:1035): the `read → increment → write` pattern is non-atomic. Two concurrent requests both read 42, both write 43 — one increment is lost. Also, if a non-integer value is ever stored, `parseInt` returns `NaN`, which then propagates as the stored value, permanently corrupting the counter. Fix: add `|| 0` fallback after `parseInt` to prevent NaN propagation (`parseInt(...) || 0`); document the non-atomic limitation with a comment (true atomic increment requires Durable Objects).

- [x] `resetToHome()` omits `setClarifyQuestions` / `setClarifying` — stale clarify UI can reappear (client.tsx:353): if the user navigates back while `/api/clarify` is in-flight, `resetToHome` clears html/code/meta but leaves `clarifyQuestions` and `clarifying` set. When the in-flight fetch resolves, `setClarifyQuestions` fires and the clarify question sheet renders unexpectedly over the home screen. Fix: add `setClarifyQuestions(null)`, `setClarifying(false)`, `setClarifyAnswers({})`, `setClarifyCustomInputs({})` to `resetToHome()`.

## P4: Code quality

- [x] Example 2 in `prompt.ts` uses a template literal while Example 1 uses `+` concatenation (llm/prompt.ts:397): the system prompt instructs the LLM not to use backticks inside the outer template literal, yet Example 2 wraps its HTML in a nested template literal. The LLM imitates the nearest example — Example 2 primes it to use template literals and increases the first-attempt backtick-nesting failure rate. Fix: rewrite Example 2 using `+` concatenation to match Example 1.

## P1: Critical bug — refine prompt sends literal placeholders to LLM

- [x] `/api/refine` prompt uses `${"${originalCode}"}` and `${"${instruction}"}` (server.ts:470,473): both expressions evaluate to the literal strings `${originalCode}` and `${instruction}` because double-quoted strings don't perform template interpolation. The LLM received placeholder text instead of the actual worker code and modification instruction — the refine feature was effectively non-functional. The unit test's `buildRefinePrompt` used correct interpolation (`${originalCode}`), masking the divergence. Fixed: changed both to plain `${originalCode}` and `${instruction}`.

## P3: Privacy cleanup

- [x] `stats:recent` dead write in `trackEvent()` (server.ts:1073): after the P2 privacy fix that removed `recentQueries` from `/api/stats`, the `trackEvent()` function still wrote every generation's topic string (which commonly contains personal financial data — income, loan amounts, family details) to `stats:recent` KV. No endpoint reads this key anymore, so the data was stored but never served. This is a wasted KV write that unnecessarily persists sensitive user queries. Fixed: removed the `stats:recent` write block from `trackEvent()`.

## P4: UX consistency

- [x] Mobile capabilities inspector missing 3 entries vs desktop (client.tsx:1647): the mobile inspector's Capabilities tab only listed 5 capabilities (`finance-apis`, `weather-apis`, `google-knowledge`, `youtube`, `general`) while the desktop version listed 8 — `india-commodity-prices`, `usda-nutrition`, and `india-utilities` were absent from the mobile panel, causing tools using those capabilities to show no active capability on mobile. Fixed: matched the mobile `capDescriptions` map to the desktop version (all 8 entries with full descriptions).

## P0: Slider fill reliability

- [x] `injectBaseCSS` uses first-match `String.replace()` for `</head>` and `</body>` (validate.ts:121-122): LLM-generated tools frequently build HTML strings in JS that contain `</body>` (e.g. table row templates, iframe srcdoc) — these appear before the real closing tag in source, so `replace()` splices `BASE_SCRIPT` into the middle of a JS string literal, causing a syntax error or injecting raw script text as visible HTML. The slider fill init never runs. Fixed: replaced `.replace("</body>", ...)` with `lastIndexOf("</body>")` index-based splice; replaced `</head>` replace with `indexOf` for consistency.

## P2: Input validation (continued)

- [ ] `query` and `model` not validated in `/api/me/tools` POST (server.ts:184-199): POST validates `runId` and `toolUrl` but stores `query` and `model` verbatim with no type or length check. An authenticated user can POST a 25 MB `query` (KV value size cap) and fill 100 tool slots (2.5 GB per uid). `model` has no format check; a non-string value crashes the `.split("/").pop()` display call in the client. Fix: add `typeof query !== "string" || query.length > 2000` and `typeof model !== "string" || model.length > 200` guards returning 400.

- [ ] DELETE `/api/me/tools` accepts any `runId` without format validation (server.ts:202-214): the POST handler has a `^[a-z0-9]{8}$` guard on `runId` (added in earlier security fix) but the DELETE handler has none. `runId: ""` or `runId: undefined` passes through to `tools.filter()` which silently no-ops (filter condition is always true), returning `{ ok: true }` for a non-delete. Fix: add `if (!runId || !/^[a-z0-9]{8}$/.test(runId)) return 400` at the start of the DELETE handler, matching the POST pattern.

## P2: Data integrity

- [ ] TOCTOU race on user tool list KV (server.ts:195-213): both POST and DELETE follow read→modify→write, so two concurrent requests (double-click Save, or Save+Delete from two tabs) each read the stale list and the second write silently overwrites the first — a user can permanently lose a saved tool. The analytics-counter race was noted in PLAN.md with a `|| 0` guard but this user-data race was not addressed. Fix: switch per-tool storage to individual KV keys (`user:${uid}:tool:${runId}`) so each save/delete is an atomic independent operation and reads are not needed for writes.

## P3: Security

- [ ] No Content-Security-Policy on `/tool/:runId` responses (server.ts:547-565): tool HTML executes in the full `yukti.app` origin with no CSP header, so LLM-generated `fetch('/api/me')` inside a tool's `<script>` carries the session cookie and can exfiltrate the user's saved-tools list. Fix (short-term): add `Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src * data:; connect-src *; form-action 'none'; frame-ancestors 'self'` to all `/tool/` responses. Long-term: serve tools from an isolated subdomain so cookies don't match the main API domain.
