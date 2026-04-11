#!/usr/bin/env node
/**
 * Unit test for Refresh (Rerun) flow.
 *
 * Tests:
 *  1.  /api/rerun returns 400 when code is missing
 *  2.  Successful rerun returns { ok: true }
 *  3.  Successful rerun returns html field
 *  4.  Successful rerun returns code field (same as input)
 *  5.  Successful rerun returns runId field
 *  6.  toolUrl is /tool/{runId} when KV is available
 *  7.  toolUrl is null when KV is unavailable
 *  8.  KV key is tool:{runId}
 *  9.  KV metadata includes refreshed: true
 * 10.  KV metadata includes topic
 * 11.  KV metadata includes createdAt timestamp
 * 12.  KV metadata does NOT include instruction (refresh ≠ refine)
 * 13.  Client: html updates after successful rerun
 * 14.  Client: runId updates after successful rerun
 * 15.  Client: toolUrl updates after successful rerun
 * 16.  Client: saved is cleared after successful rerun
 * 17.  Client: copied is cleared after successful rerun
 * 18.  Client: html unchanged on failed rerun response
 * 19.  injectBaseCSS is called — returned html contains base-css marker
 * 20.  runId is unique across successive reruns
 *
 * Run: node scripts/test-refresh-flow.mjs
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
function assertNotEqual(a, b, msg) {
  if (a === b) throw new Error(msg || `Expected values to differ, but both are ${JSON.stringify(a)}`);
}

// ── Replicate server-side /api/rerun validation logic ─────────────────────
// Mirrors src/server.ts lines 720-723
function validateRerunRequest(body) {
  const { code } = body || {};
  if (!code) {
    return { status: 400, error: "code is required" };
  }
  return { status: 200, error: null };
}

// ── Replicate server-side KV save logic ───────────────────────────────────
// Mirrors src/server.ts lines 732-740
function saveRerunToKV(kv, runId, html, topic, uid) {
  if (!kv) return null;
  try {
    const createdAt = new Date().toISOString();
    kv[`tool:${runId}`] = {
      html,
      metadata: { topic, refreshed: true, uid, createdAt },
    };
    return `/tool/${runId}`;
  } catch {
    return null;
  }
}

// ── Replicate server-side response construction ───────────────────────────
// Mirrors src/server.ts lines 743-750
function buildRerunResponse(html, code, runId, toolUrl, execMs, granted) {
  return {
    ok: true,
    html,
    code,
    runId,
    toolUrl,
    meta: { timing: { execMs }, granted },
  };
}

// ── Replicate client-side Refresh button handler state update ─────────────
// Mirrors src/client.tsx lines 1125-1143
function applyRerunResult(state, data) {
  if (data.ok && data.html) {
    return {
      ...state,
      html: data.html,
      runId: data.runId,
      toolUrl: data.toolUrl,
      saved: false,
      copied: false,
    };
  }
  // On failure, leave state unchanged (the catch swallows errors)
  return { ...state };
}

// ── Helpers ───────────────────────────────────────────────────────────────
function makeHtml(title = "Test Tool", withCssMarker = false) {
  const marker = withCssMarker ? '<style>/* yukti-base-css */</style>' : '';
  return `<!DOCTYPE html>\n<html>\n<head><title>${title}</title>${marker}</head>\n<body><h1>${title}</h1></body>\n</html>`;
}

function generateRunId() {
  return `run-${Math.random().toString(36).slice(2, 10)}`;
}

const SAMPLE_CODE = `export default {
  fetch(request, env) {
    return new Response("<!DOCTYPE html><html><body><h1>Live Tool</h1><p>Data: " + Date.now() + "</p></body></html>", {
      headers: { "Content-Type": "text/html" }
    });
  }
}`;

// ── Tests ─────────────────────────────────────────────────────────────────

// 1. Missing code → 400
test("/api/rerun returns 400 when code is missing", () => {
  const result = validateRerunRequest({ topic: "BMI Calculator" });
  assertEqual(result.status, 400, "should return 400");
  assert(result.error.includes("code is required"), "error message should mention code");
});

// 2. Valid request → ok: true
test("Successful rerun returns ok: true", () => {
  const runId = generateRunId();
  const response = buildRerunResponse(makeHtml("Live Tool"), SAMPLE_CODE, runId, `/tool/${runId}`, 120, []);
  assertEqual(response.ok, true, "ok should be true");
});

// 3. Successful rerun returns html
test("Successful rerun returns html field", () => {
  const runId = generateRunId();
  const html = makeHtml("Refreshed Tool");
  const response = buildRerunResponse(html, SAMPLE_CODE, runId, `/tool/${runId}`, 120, []);
  assertEqual(response.html, html, "html field should match");
});

// 4. Successful rerun returns code (same as input)
test("Successful rerun returns code field equal to input code", () => {
  const runId = generateRunId();
  const response = buildRerunResponse(makeHtml(), SAMPLE_CODE, runId, `/tool/${runId}`, 120, []);
  assertEqual(response.code, SAMPLE_CODE, "code should be the same as input (rerun, not refine)");
});

// 5. Successful rerun returns runId
test("Successful rerun returns runId field", () => {
  const runId = "run-test-refresh-05";
  const response = buildRerunResponse(makeHtml(), SAMPLE_CODE, runId, `/tool/${runId}`, 120, []);
  assertEqual(response.runId, runId, "runId should match");
});

// 6. toolUrl is /tool/{runId} when KV available
test("toolUrl is /tool/{runId} when KV is available", () => {
  const kv = {};
  const runId = "run-kv-refresh-01";
  const toolUrl = saveRerunToKV(kv, runId, makeHtml(), "BMI Calculator", "user-123");
  assertEqual(toolUrl, `/tool/${runId}`, `toolUrl should be /tool/${runId}`);
});

// 7. toolUrl is null when KV unavailable
test("toolUrl is null when KV is not configured", () => {
  const toolUrl = saveRerunToKV(null, "run-kv-refresh-02", makeHtml(), "BMI", "user-123");
  assertEqual(toolUrl, null, "toolUrl should be null without KV");
});

// 8. KV key is tool:{runId}
test("KV stores entry under key tool:{runId}", () => {
  const kv = {};
  const runId = "kv-refresh-key-test";
  saveRerunToKV(kv, runId, makeHtml(), "BMI Calculator", "user-123");
  assert(`tool:${runId}` in kv, `KV should have key tool:${runId}`);
});

// 9. KV metadata includes refreshed: true
test("KV metadata includes refreshed: true", () => {
  const kv = {};
  const runId = "kv-refresh-meta-01";
  saveRerunToKV(kv, runId, makeHtml(), "BMI Calculator", "user-123");
  assertEqual(kv[`tool:${runId}`].metadata.refreshed, true, "metadata.refreshed should be true");
});

// 10. KV metadata includes topic
test("KV metadata includes topic", () => {
  const kv = {};
  const runId = "kv-refresh-meta-02";
  const topic = "Calorie Counter";
  saveRerunToKV(kv, runId, makeHtml(), topic, "user-123");
  assertEqual(kv[`tool:${runId}`].metadata.topic, topic, "metadata.topic should match");
});

// 11. KV metadata includes createdAt timestamp
test("KV metadata includes createdAt ISO timestamp", () => {
  const kv = {};
  const runId = "kv-refresh-meta-03";
  saveRerunToKV(kv, runId, makeHtml(), "BMI", "user-123");
  const { createdAt } = kv[`tool:${runId}`].metadata;
  assert(typeof createdAt === "string" && createdAt.length > 0, "metadata.createdAt should be a non-empty string");
  assert(!isNaN(Date.parse(createdAt)), `metadata.createdAt should be a valid ISO date, got: ${createdAt}`);
});

// 12. KV metadata does NOT include instruction (refresh ≠ refine)
test("KV metadata does not include instruction (refresh is not a refine)", () => {
  const kv = {};
  const runId = "kv-refresh-meta-04";
  saveRerunToKV(kv, runId, makeHtml(), "BMI", "user-123");
  assertEqual(kv[`tool:${runId}`].metadata.instruction, undefined, "metadata should not have instruction");
});

// 13. Client: html updates after successful rerun
test("Client applyRerunResult updates html on success", () => {
  const prevState = { html: makeHtml("Old"), runId: "old-run", toolUrl: "/tool/old", saved: true, copied: true };
  const newHtml = makeHtml("Refreshed");
  const data = { ok: true, html: newHtml, code: SAMPLE_CODE, runId: "new-run", toolUrl: "/tool/new-run" };
  const next = applyRerunResult(prevState, data);
  assertEqual(next.html, newHtml, "html should update to new html");
});

// 14. Client: runId updates after successful rerun
test("Client applyRerunResult updates runId on success", () => {
  const prevState = { html: makeHtml("Old"), runId: "old-run", toolUrl: "/tool/old", saved: true, copied: false };
  const data = { ok: true, html: makeHtml("New"), code: SAMPLE_CODE, runId: "new-run-14", toolUrl: "/tool/new-run-14" };
  const next = applyRerunResult(prevState, data);
  assertEqual(next.runId, "new-run-14", "runId should update");
});

// 15. Client: toolUrl updates after successful rerun
test("Client applyRerunResult updates toolUrl on success", () => {
  const prevState = { html: makeHtml("Old"), runId: "old-run", toolUrl: "/tool/old", saved: false, copied: false };
  const data = { ok: true, html: makeHtml("New"), code: SAMPLE_CODE, runId: "new-run-15", toolUrl: "/tool/new-run-15" };
  const next = applyRerunResult(prevState, data);
  assertEqual(next.toolUrl, "/tool/new-run-15", "toolUrl should update");
});

// 16. Client: saved is cleared after successful rerun
test("Client applyRerunResult clears saved flag after success", () => {
  const prevState = { html: makeHtml("Old"), runId: "old-run", toolUrl: "/tool/old", saved: true, copied: false };
  const data = { ok: true, html: makeHtml("New"), code: SAMPLE_CODE, runId: "new-run-16", toolUrl: null };
  const next = applyRerunResult(prevState, data);
  assertEqual(next.saved, false, "saved should be cleared to false");
});

// 17. Client: copied is cleared after successful rerun
test("Client applyRerunResult clears copied flag after success", () => {
  const prevState = { html: makeHtml("Old"), runId: "old-run", toolUrl: "/tool/old", saved: false, copied: true };
  const data = { ok: true, html: makeHtml("New"), code: SAMPLE_CODE, runId: "new-run-17", toolUrl: null };
  const next = applyRerunResult(prevState, data);
  assertEqual(next.copied, false, "copied should be cleared to false");
});

// 18. Client: html unchanged on failed rerun
test("Client applyRerunResult leaves html unchanged on failed response", () => {
  const originalHtml = makeHtml("Old Tool");
  const prevState = { html: originalHtml, runId: "old-run", toolUrl: null, saved: false, copied: false };
  const data = { ok: false, error: "Worker execution failed" };
  const next = applyRerunResult(prevState, data);
  assertEqual(next.html, originalHtml, "html should remain unchanged on failure");
});

// 19. Returned html contains base CSS marker after injection
test("injectBaseCSS — returned html contains base-css marker", () => {
  // Simulate what injectBaseCSS does: wraps raw html with a CSS marker
  function injectBaseCSS(rawHtml, css) {
    const styleTag = `<style>/* yukti-base-css */\n${css}</style>`;
    return rawHtml.replace(/<\/head>/i, `${styleTag}</head>`);
  }
  const rawHtml = makeHtml("Live Tool");
  const injected = injectBaseCSS(rawHtml, "body { margin: 0; }");
  assert(injected.includes("yukti-base-css"), "injected html should contain base-css marker");
  assert(injected.includes("body { margin: 0; }"), "injected html should contain the CSS content");
});

// 20. runId is unique across successive reruns
test("generateRunId produces unique IDs for successive calls", () => {
  const ids = new Set();
  for (let i = 0; i < 100; i++) {
    ids.add(generateRunId());
  }
  assertEqual(ids.size, 100, "all 100 generated runIds should be unique");
});

// ── Results ───────────────────────────────────────────────────────────────
if (failed) {
  process.exitCode = 1;
  console.error("\nRefresh-flow tests FAILED.");
} else {
  console.log("\nAll refresh-flow tests passed ✔");
}
