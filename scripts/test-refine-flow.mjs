#!/usr/bin/env node
/**
 * Unit test for Refine flow.
 *
 * Tests:
 *  1.  /api/refine returns 400 when code is missing
 *  2.  /api/refine returns 400 when instruction is missing
 *  3.  Successful refine returns { ok: true }
 *  4.  Successful refine returns html field
 *  5.  Successful refine returns code field
 *  6.  Successful refine returns runId field
 *  7.  toolUrl is /tool/{runId} when KV is available
 *  8.  toolUrl is null when KV is unavailable
 *  9.  Refine prompt includes original code
 * 10.  Refine prompt includes instruction
 * 11.  Refine prompt includes topic
 * 12.  Refine prompt asks for COMPLETE modified Worker
 * 13.  KV key is tool:{runId}
 * 14.  KV metadata includes instruction
 * 15.  KV metadata includes topic
 * 16.  Client: html updates after successful refine
 * 17.  Client: code updates after successful refine
 * 18.  Client: runId updates after successful refine
 * 19.  Client: refineInput cleared after successful refine
 * 20.  Client: error set on failed refine response
 *
 * Run: node scripts/test-refine-flow.mjs
 */

let failed = false;
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    failed = true;
    console.error(`❌ ${name} — ${err.message}`);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed");
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ── Replicate server-side /api/refine validation logic ────────────────────────
// Mirrors src/server.ts lines 553-561
function validateRefineRequest(body) {
  const { code: originalCode, instruction } = body || {};
  if (!originalCode || !instruction) {
    return { status: 400, error: "code and instruction are required" };
  }
  return { status: 200, error: null };
}

// ── Replicate server-side refine prompt construction ─────────────────────────
// Mirrors src/server.ts lines 566-574
function buildRefinePrompt(topic, originalCode, instruction) {
  return `Here is a Cloudflare Worker module that generates an interactive tool for: "${topic}"

\`\`\`javascript
${originalCode}
\`\`\`

The user wants this modification: "${instruction}"

Return the COMPLETE modified Worker module with the change applied. Return ONLY the JavaScript module — no explanation, no markdown fences. Keep everything that works, only change what the user asked for.`;
}

// ── Replicate server-side KV save logic ───────────────────────────────────────
// Mirrors src/server.ts lines 601-610
function saveRefinedToKV(kv, runId, html, metadata) {
  if (!kv) return null;
  try {
    kv[`tool:${runId}`] = { html, metadata };
    return `/tool/${runId}`;
  } catch {
    return null;
  }
}

// ── Replicate server-side response construction ───────────────────────────────
// Mirrors src/server.ts lines 614-625
function buildRefineResponse(html, code, runId, toolUrl, model, provider, llmMs, totalMs) {
  return {
    ok: true,
    html,
    code,
    runId,
    toolUrl,
    meta: {
      model,
      provider,
      timing: { llmMs, totalMs },
    },
  };
}

// ── Replicate client-side handleRefine state update logic ─────────────────────
// Mirrors src/client.tsx lines 478-484
function applyRefineResult(state, data) {
  if (data.ok && data.html) {
    return {
      html: data.html,
      code: data.code || null,
      runId: data.runId,
      toolUrl: data.toolUrl,
      meta: data.meta || state.meta,
      refineInput: "",
      error: null,
    };
  }
  return { ...state, error: data.error || "Refinement failed" };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeHtml(title = "Test Tool") {
  return `<!DOCTYPE html>\n<html>\n<head><title>${title}</title></head>\n<body><h1>${title}</h1></body>\n</html>`;
}

const ORIGINAL_CODE = `export default { fetch(request, env) { return new Response("<!DOCTYPE html><html><body><h1>BMI Calculator</h1></body></html>", { headers: { "Content-Type": "text/html" } }); } }`;
const REFINED_CODE  = `export default { fetch(request, env) { return new Response("<!DOCTYPE html><html><body><h1>BMI Calculator</h1><p>Add kg support</p></body></html>", { headers: { "Content-Type": "text/html" } }); } }`;

// ── Tests ─────────────────────────────────────────────────────────────────────

// 1. Missing code → 400
test("/api/refine returns 400 when code is missing", () => {
  const result = validateRefineRequest({ instruction: "add dark mode" });
  assertEqual(result.status, 400, "should return 400");
  assert(result.error.includes("code and instruction are required"), "error message correct");
});

// 2. Missing instruction → 400
test("/api/refine returns 400 when instruction is missing", () => {
  const result = validateRefineRequest({ code: ORIGINAL_CODE });
  assertEqual(result.status, 400, "should return 400");
  assert(result.error.includes("code and instruction are required"), "error message correct");
});

// 3. Valid request → 200
test("validateRefineRequest accepts valid code + instruction", () => {
  const result = validateRefineRequest({ code: ORIGINAL_CODE, instruction: "add dark mode", topic: "BMI Calculator" });
  assertEqual(result.status, 200, "should return 200");
  assertEqual(result.error, null, "error should be null");
});

// 4. Successful refine returns html
test("Successful refine response includes html", () => {
  const runId = "run-test-01";
  const html = makeHtml("Refined Tool");
  const response = buildRefineResponse(html, REFINED_CODE, runId, `/tool/${runId}`, "gpt-4o", "openai", 1500, 2000);
  assert(response.html === html, "html field should be present");
});

// 5. Successful refine returns code
test("Successful refine response includes code", () => {
  const runId = "run-test-02";
  const response = buildRefineResponse(makeHtml(), REFINED_CODE, runId, `/tool/${runId}`, "gpt-4o", "openai", 1500, 2000);
  assertEqual(response.code, REFINED_CODE, "code field should be refined code");
});

// 6. Successful refine returns runId
test("Successful refine response includes runId", () => {
  const runId = "run-test-03";
  const response = buildRefineResponse(makeHtml(), REFINED_CODE, runId, `/tool/${runId}`, "gpt-4o", "openai", 1500, 2000);
  assertEqual(response.runId, runId, "runId field should match");
});

// 7. toolUrl is /tool/{runId} when KV available
test("toolUrl is /tool/{runId} when KV is available", () => {
  const kv = {};
  const runId = "run-kv-01";
  const toolUrl = saveRefinedToKV(kv, runId, makeHtml(), { topic: "BMI", instruction: "add dark mode" });
  assertEqual(toolUrl, `/tool/${runId}`, "toolUrl should be /tool/run-kv-01");
});

// 8. toolUrl is null when KV unavailable
test("toolUrl is null when KV is not configured", () => {
  const toolUrl = saveRefinedToKV(null, "run-kv-02", makeHtml(), {});
  assertEqual(toolUrl, null, "toolUrl should be null without KV");
});

// 9. Prompt includes original code
test("Refine prompt includes the original code", () => {
  const prompt = buildRefinePrompt("BMI Calculator", ORIGINAL_CODE, "add dark mode");
  assert(prompt.includes(ORIGINAL_CODE), "prompt should contain original code");
});

// 10. Prompt includes instruction
test("Refine prompt includes the instruction", () => {
  const prompt = buildRefinePrompt("BMI Calculator", ORIGINAL_CODE, "add dark mode");
  assert(prompt.includes("add dark mode"), "prompt should contain instruction");
});

// 11. Prompt includes topic
test("Refine prompt includes the topic", () => {
  const prompt = buildRefinePrompt("BMI Calculator", ORIGINAL_CODE, "add dark mode");
  assert(prompt.includes("BMI Calculator"), "prompt should contain topic");
});

// 12. Prompt asks for COMPLETE modified Worker
test("Refine prompt asks for COMPLETE modified Worker module", () => {
  const prompt = buildRefinePrompt("BMI Calculator", ORIGINAL_CODE, "add dark mode");
  assert(prompt.includes("COMPLETE modified Worker module"), "prompt should ask for COMPLETE modified Worker module");
});

// 13. KV key is tool:{runId}
test("KV stores entry under key tool:{runId}", () => {
  const kv = {};
  const runId = "kv-key-test";
  saveRefinedToKV(kv, runId, makeHtml(), { topic: "T", instruction: "I" });
  assert(`tool:${runId}` in kv, `KV should have key tool:${runId}`);
});

// 14. KV metadata includes instruction
test("KV metadata includes instruction", () => {
  const kv = {};
  const runId = "kv-meta-01";
  const instruction = "change font size to 18px";
  saveRefinedToKV(kv, runId, makeHtml(), { topic: "BMI", instruction });
  assertEqual(kv[`tool:${runId}`].metadata.instruction, instruction, "metadata.instruction should match");
});

// 15. KV metadata includes topic
test("KV metadata includes topic", () => {
  const kv = {};
  const runId = "kv-meta-02";
  const topic = "Calorie Counter";
  saveRefinedToKV(kv, runId, makeHtml(), { topic, instruction: "add reset button" });
  assertEqual(kv[`tool:${runId}`].metadata.topic, topic, "metadata.topic should match");
});

// 16. Client: html updates after successful refine
test("Client applyRefineResult updates html on success", () => {
  const prevState = { html: makeHtml("Old"), code: ORIGINAL_CODE, runId: "old-run", toolUrl: "/tool/old", meta: null, refineInput: "add dark mode", error: null };
  const newHtml = makeHtml("Refined");
  const data = { ok: true, html: newHtml, code: REFINED_CODE, runId: "new-run", toolUrl: "/tool/new-run", meta: { model: "m", provider: "p", timing: {} } };
  const next = applyRefineResult(prevState, data);
  assertEqual(next.html, newHtml, "html should update");
});

// 17. Client: code updates after successful refine
test("Client applyRefineResult updates code on success", () => {
  const prevState = { html: makeHtml("Old"), code: ORIGINAL_CODE, runId: "old", toolUrl: "/tool/old", meta: null, refineInput: "x", error: null };
  const data = { ok: true, html: makeHtml("New"), code: REFINED_CODE, runId: "new", toolUrl: "/tool/new", meta: null };
  const next = applyRefineResult(prevState, data);
  assertEqual(next.code, REFINED_CODE, "code should update");
});

// 18. Client: runId updates after successful refine
test("Client applyRefineResult updates runId on success", () => {
  const prevState = { html: makeHtml(), code: ORIGINAL_CODE, runId: "old-run", toolUrl: "/tool/old", meta: null, refineInput: "x", error: null };
  const data = { ok: true, html: makeHtml("New"), code: REFINED_CODE, runId: "new-run-42", toolUrl: "/tool/new-run-42", meta: null };
  const next = applyRefineResult(prevState, data);
  assertEqual(next.runId, "new-run-42", "runId should update to new-run-42");
});

// 19. Client: refineInput cleared after successful refine
test("Client applyRefineResult clears refineInput after success", () => {
  const prevState = { html: makeHtml(), code: ORIGINAL_CODE, runId: "old", toolUrl: null, meta: null, refineInput: "add dark mode", error: null };
  const data = { ok: true, html: makeHtml("New"), code: REFINED_CODE, runId: "new", toolUrl: null, meta: null };
  const next = applyRefineResult(prevState, data);
  assertEqual(next.refineInput, "", "refineInput should be cleared");
});

// 20. Client: error set on failed refine
test("Client applyRefineResult sets error on failed response", () => {
  const prevState = { html: makeHtml(), code: ORIGINAL_CODE, runId: "old", toolUrl: null, meta: null, refineInput: "bad instruction", error: null };
  const data = { ok: false, error: "Refined code invalid: missing export" };
  const next = applyRefineResult(prevState, data);
  assertEqual(next.error, "Refined code invalid: missing export", "error should be set");
  // html should not change
  assertEqual(next.html, prevState.html, "html should remain unchanged on error");
});

// ── Results ───────────────────────────────────────────────────────────────────
if (failed) {
  process.exitCode = 1;
  console.error("\nRefine-flow tests FAILED.");
} else {
  console.log("\nAll refine-flow tests passed ✔");
}
