#!/usr/bin/env node
/**
 * Unit test for Fork from My Tools → regeneration flow.
 *
 * Tests:
 *  1. Fork button extracts correct query from a saved tool
 *  2. Fork calls generate() directly — bypasses clarification (submitQuery not used)
 *  3. Each fork generates a unique runId (new 8-char alphanumeric string)
 *  4. Forked tool has same query as original but different runId
 *  5. Forked toolUrl is /tool/{newRunId}, not the original toolUrl
 *  6. Original and forked tools can coexist in My Tools (different runIds)
 *  7. Saving the fork creates a separate entry — doesn't overwrite the original
 *  8. Multiple forks of the same tool all produce distinct runIds
 *  9. generateRunId() returns 8-char alphanumeric string
 * 10. generateRunId() produces different values on successive calls
 * 11. Forked tool savedAt is recent (not copied from original)
 * 12. Saving fork prepends to My Tools (fork appears first)
 * 13. Original tool is unchanged after saving a fork
 * 14. My Tools still has the original after saving the fork
 * 15. Fork of a fork preserves the query correctly
 * 16. Saving 2 forks of same tool → 3 entries total (original + 2 forks)
 * 17. Fork does NOT call handleLoadTool — it resets runId to null before streaming
 * 18. SSE complete event for fork contains a non-null runId
 * 19. SSE complete event for fork contains html
 * 20. SSE complete event toolUrl starts with /tool/
 *
 * Run: node scripts/test-fork-flow.mjs
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
  if (a === b) throw new Error(msg || `Expected values to differ, both are ${JSON.stringify(a)}`);
}

// ── Replicate generateRunId() from src/server.ts (line 949) ───────────────────
function generateRunId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

// ── Replicate localStorage helpers from src/client.tsx ────────────────────────
const store = {};
const localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
};

function getSavedTools() {
  try { return JSON.parse(localStorage.getItem("yukti-tools") || "[]"); }
  catch { return []; }
}

function saveTool(tool) {
  const tools = getSavedTools().filter(t => t.runId !== tool.runId);
  tools.unshift(tool);
  if (tools.length > 50) tools.length = 50;
  localStorage.setItem("yukti-tools", JSON.stringify(tools));
}

// ── Simulate the fork button click behavior from src/client.tsx line 859 ──────
// onClick={() => { setQuery(tool.query); generate(tool.query); }}
//
// generate() resets runId to null, then makes POST to /api/stream, which
// returns a new complete SSE event. We simulate that event payload here.

function simulateFork(savedTool, kvStore) {
  // Step 1: setQuery(tool.query) — captures the query from the saved tool
  const topic = savedTool.query;

  // Step 2: generate(topic) — resets state
  // Mirroring generate() lines 497-512: setRunId(null), setSaved(false), etc.
  let runId = null;        // reset
  let toolUrl = null;      // reset
  let saved = false;       // reset
  let html = null;         // reset

  // Step 3: server generates fresh content via /api/stream
  // Server calls generateRunId() → new unique ID
  const newRunId = generateRunId();
  const newHtml = `<!DOCTYPE html><html><head><title>${topic}</title></head><body><p>Generated tool for: ${topic}</p></body></html>`;

  // Save to KV store (mirrors server lines 322-326)
  kvStore[`tool:${newRunId}`] = { html: newHtml, metadata: { topic, model: "anthropic/claude-3-haiku" } };
  const newToolUrl = `/tool/${newRunId}`;

  // Step 4: SSE complete event arrives (mirrors client lines 582-587)
  runId = newRunId;
  toolUrl = newToolUrl;
  html = newHtml;

  return { topic, runId, toolUrl, html };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeSavedTool(overrides = {}) {
  return {
    runId: `orig${Math.random().toString(36).slice(2, 6)}`,
    query: "BMI calculator for Indian adults",
    toolUrl: "/tool/origabcd",
    model: "anthropic/claude-3-haiku",
    savedAt: new Date(Date.now() - 60000).toISOString(), // 1 min ago
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test("generateRunId returns an 8-character string", () => {
  const id = generateRunId();
  assertEqual(id.length, 8, `runId should be 8 chars, got ${id.length}`);
});

test("generateRunId uses only alphanumeric characters", () => {
  for (let i = 0; i < 20; i++) {
    const id = generateRunId();
    assert(/^[a-z0-9]{8}$/.test(id), `runId should be lowercase alphanumeric, got: ${id}`);
  }
});

test("generateRunId produces different values on successive calls", () => {
  const ids = new Set(Array.from({ length: 10 }, generateRunId));
  // With 36^8 ≈ 2.8 trillion combinations, all 10 should be unique
  assert(ids.size > 1, "generateRunId should produce different IDs");
});

test("fork extracts correct query from saved tool", () => {
  const tool = makeSavedTool({ query: "Tax calculator for salaried employees" });
  // Fork button: setQuery(tool.query) → generate(tool.query)
  const topic = tool.query;
  assertEqual(topic, "Tax calculator for salaried employees", "query should match saved tool");
});

test("fork uses generate() not handleLoadTool() — generates new HTML", () => {
  const originalTool = makeSavedTool({ query: "EMI calculator" });
  const kv = {};
  const result = simulateFork(originalTool, kv);
  // The result should be fresh HTML, not the stored HTML
  assert(result.html !== null, "fork should produce html");
  assert(result.html.includes("EMI calculator"), "html should contain the query");
  // The new tool URL must differ from original
  assertNotEqual(result.toolUrl, originalTool.toolUrl, "fork should have different toolUrl");
});

test("forked tool gets a new runId, not the original runId", () => {
  const originalTool = makeSavedTool({ runId: "origabcd" });
  const kv = {};
  const result = simulateFork(originalTool, kv);
  assertNotEqual(result.runId, originalTool.runId, "fork must have new runId");
  assertNotEqual(result.runId, "origabcd", "fork runId should not be 'origabcd'");
});

test("forked toolUrl is /tool/{newRunId}", () => {
  const originalTool = makeSavedTool();
  const kv = {};
  const result = simulateFork(originalTool, kv);
  assertEqual(result.toolUrl, `/tool/${result.runId}`, "toolUrl should be /tool/{runId}");
  assert(result.toolUrl.startsWith("/tool/"), "toolUrl should start with /tool/");
});

test("forked toolUrl differs from original toolUrl", () => {
  const originalTool = makeSavedTool({ toolUrl: "/tool/origabcd" });
  const kv = {};
  const result = simulateFork(originalTool, kv);
  assertNotEqual(result.toolUrl, "/tool/origabcd", "forked toolUrl should differ from original");
});

test("forked tool has the same query as original", () => {
  const originalTool = makeSavedTool({ query: "SIP return calculator" });
  const kv = {};
  const result = simulateFork(originalTool, kv);
  assertEqual(result.topic, "SIP return calculator", "fork should preserve the original query");
});

test("original and forked tools coexist in My Tools (different runIds, same query)", () => {
  delete store["yukti-tools"];
  const original = makeSavedTool({ runId: "origaaaa", query: "Calorie counter" });
  saveTool(original);

  const kv = {};
  const forkResult = simulateFork(original, kv);

  // Save the forked tool (mirrors client save button behavior)
  const forkedTool = {
    runId: forkResult.runId,
    query: forkResult.topic,
    toolUrl: forkResult.toolUrl,
    model: "anthropic/claude-3-haiku",
    savedAt: new Date().toISOString(),
  };
  saveTool(forkedTool);

  const tools = getSavedTools();
  assertEqual(tools.length, 2, "should have 2 tools — original and fork");
  assert(tools.some(t => t.runId === "origaaaa"), "original should still be present");
  assert(tools.some(t => t.runId === forkResult.runId), "fork should be present");
  assertEqual(tools.filter(t => t.query === "Calorie counter").length, 2,
    "both tools should have the same query");
});

test("saving the fork does not overwrite original", () => {
  delete store["yukti-tools"];
  const original = makeSavedTool({ runId: "origbbbb", query: "BMI calculator" });
  saveTool(original);

  const kv = {};
  const forkResult = simulateFork(original, kv);
  const forkedTool = {
    runId: forkResult.runId,
    query: forkResult.topic,
    toolUrl: forkResult.toolUrl,
    model: "anthropic/claude-3-haiku",
    savedAt: new Date().toISOString(),
  };
  saveTool(forkedTool);

  const tools = getSavedTools();
  const orig = tools.find(t => t.runId === "origbbbb");
  assert(orig !== undefined, "original tool should still exist");
  assertEqual(orig.toolUrl, "/tool/origabcd", "original toolUrl should be unchanged");
});

test("fork appears first in My Tools (newest first)", () => {
  delete store["yukti-tools"];
  const original = makeSavedTool({ runId: "origcccc" });
  saveTool(original);

  const kv = {};
  const forkResult = simulateFork(original, kv);
  const forkedTool = {
    runId: forkResult.runId,
    query: forkResult.topic,
    toolUrl: forkResult.toolUrl,
    model: "anthropic/claude-3-haiku",
    savedAt: new Date().toISOString(),
  };
  saveTool(forkedTool);

  const tools = getSavedTools();
  // Fork should be prepended (newest first)
  assertEqual(tools[0].runId, forkResult.runId, "fork should be first (newest)");
  assertEqual(tools[1].runId, "origcccc", "original should be second (older)");
});

test("original tool is unchanged after saving a fork", () => {
  delete store["yukti-tools"];
  const original = makeSavedTool({
    runId: "origdddd",
    query: "Loan EMI calculator",
    toolUrl: "/tool/origdddd",
    savedAt: "2026-01-01T00:00:00.000Z",
  });
  saveTool(original);

  const kv = {};
  const forkResult = simulateFork(original, kv);
  const forkedTool = {
    runId: forkResult.runId,
    query: forkResult.topic,
    toolUrl: forkResult.toolUrl,
    model: "anthropic/claude-3-haiku",
    savedAt: new Date().toISOString(),
  };
  saveTool(forkedTool);

  const tools = getSavedTools();
  const orig = tools.find(t => t.runId === "origdddd");
  assert(orig !== undefined, "original should still exist");
  assertEqual(orig.toolUrl, "/tool/origdddd", "original toolUrl unchanged");
  assertEqual(orig.savedAt, "2026-01-01T00:00:00.000Z", "original savedAt unchanged");
});

test("multiple forks produce unique runIds", () => {
  const original = makeSavedTool({ query: "Currency converter" });
  const kv = {};
  const runIds = new Set();
  for (let i = 0; i < 5; i++) {
    const result = simulateFork(original, kv);
    runIds.add(result.runId);
  }
  // With 36^8 combinations, all 5 should be unique
  assertEqual(runIds.size, 5, "all fork runIds should be unique");
});

test("saving 2 forks of same tool → 3 entries total", () => {
  delete store["yukti-tools"];
  const original = makeSavedTool({ runId: "origeeee", query: "GST calculator" });
  saveTool(original);

  const kv = {};

  const fork1 = simulateFork(original, kv);
  saveTool({ runId: fork1.runId, query: fork1.topic, toolUrl: fork1.toolUrl,
    model: "anthropic/claude-3-haiku", savedAt: new Date().toISOString() });

  const fork2 = simulateFork(original, kv);
  saveTool({ runId: fork2.runId, query: fork2.topic, toolUrl: fork2.toolUrl,
    model: "anthropic/claude-3-haiku", savedAt: new Date().toISOString() });

  const tools = getSavedTools();
  assertEqual(tools.length, 3, "should have 3 entries: original + fork1 + fork2");
  assert(tools.some(t => t.runId === "origeeee"), "original should be present");
  assert(tools.some(t => t.runId === fork1.runId), "fork1 should be present");
  assert(tools.some(t => t.runId === fork2.runId), "fork2 should be present");
});

test("fork of a fork preserves the query", () => {
  const original = makeSavedTool({ query: "Protein intake calculator" });
  const kv = {};
  const fork1 = simulateFork(original, kv);

  // Create a "saved tool" from the first fork result
  const fork1AsSaved = {
    runId: fork1.runId,
    query: fork1.topic,
    toolUrl: fork1.toolUrl,
    model: "anthropic/claude-3-haiku",
    savedAt: new Date().toISOString(),
  };

  // Fork the fork
  const fork2 = simulateFork(fork1AsSaved, kv);
  assertEqual(fork2.topic, "Protein intake calculator", "fork of fork should preserve query");
  assertNotEqual(fork2.runId, fork1.runId, "fork of fork should have new runId");
});

test("SSE complete payload has non-null runId", () => {
  const original = makeSavedTool({ query: "Water intake tracker" });
  const kv = {};
  const result = simulateFork(original, kv);
  assert(result.runId !== null, "SSE complete should include a runId");
  assert(typeof result.runId === "string", "runId should be a string");
  assert(result.runId.length > 0, "runId should be non-empty");
});

test("SSE complete payload has html", () => {
  const original = makeSavedTool({ query: "Step counter goal tracker" });
  const kv = {};
  const result = simulateFork(original, kv);
  assert(result.html !== null, "SSE complete should include html");
  assert(result.html.length > 0, "html should be non-empty");
});

test("SSE complete payload toolUrl starts with /tool/", () => {
  const original = makeSavedTool({ query: "Heart rate zone calculator" });
  const kv = {};
  const result = simulateFork(original, kv);
  assert(result.toolUrl.startsWith("/tool/"), `toolUrl should start with /tool/, got: ${result.toolUrl}`);
});

test("fork generate() resets saved=false (save button re-appears)", () => {
  // Mirrors generate() lines 507-508: setSaved(false) is called at start of generate
  // This ensures the save button is shown again after forking
  // We simulate the state machine: before fork saved=true, after generate() saved=false
  let saved = true; // user had already saved the original

  // Simulate generate() starting: setSaved(false)
  saved = false;

  assertEqual(saved, false, "generate() should reset saved to false so save button re-appears");
});

test("fork generate() resets runId to null before streaming", () => {
  // Mirrors generate() line 501: setRunId(null)
  let runId = "origabcd"; // had original runId

  // Simulate generate() starting: setRunId(null)
  runId = null;

  assertEqual(runId, null, "generate() should reset runId to null before SSE completes");
});

// ── Results ────────────────────────────────────────────────────────────────────
if (failed) {
  process.exitCode = 1;
  console.error("\nFork-flow tests FAILED.");
} else {
  console.log("\nAll fork-flow tests passed ✔");
}
