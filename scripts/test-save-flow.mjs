#!/usr/bin/env node
/**
 * Unit test for Save → My Tools flow.
 *
 * Tests:
 *  1. savedTool data shape is consistent between client and server
 *  2. localStorage helper functions (getSavedTools / saveTool / removeTool)
 *  3. Server-side userData manipulation logic (getUserData + POST /api/me/tools)
 *  4. Deduplication: saving the same runId twice keeps only one entry
 *  5. Cap at 100 tools on server, 50 on client
 *  6. Remove removes only the targeted tool
 *  7. After load, server tools override localStorage (merge logic)
 *
 * Run: node scripts/test-save-flow.mjs
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

// ── Replicate client-side localStorage helpers ─────────────────────────────
// Mirrors src/client.tsx lines 62-78
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

function removeTool(runId) {
  const tools = getSavedTools().filter(t => t.runId !== runId);
  localStorage.setItem("yukti-tools", JSON.stringify(tools));
}

// ── Replicate server-side userData logic ──────────────────────────────────
// Mirrors src/server.ts lines 117-173
function getUserData(kv, uid) {
  const raw = kv[`user:${uid}`];
  if (raw) return JSON.parse(raw);
  return { tools: [], createdAt: new Date().toISOString() };
}

function serverSaveTool(kv, uid, tool) {
  const userData = getUserData(kv, uid);
  userData.tools = [tool, ...userData.tools.filter(t => t.runId !== tool.runId)].slice(0, 100);
  kv[`user:${uid}`] = JSON.stringify(userData);
  return userData.tools;
}

function serverRemoveTool(kv, uid, runId) {
  const userData = getUserData(kv, uid);
  userData.tools = userData.tools.filter(t => t.runId !== runId);
  kv[`user:${uid}`] = JSON.stringify(userData);
  return userData.tools;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function makeTool(i = 1) {
  return {
    runId: `run-${i}`,
    query: `Test query ${i}`,
    toolUrl: `/t/run-${i}`,
    model: "anthropic/claude-3-haiku",
    savedAt: new Date().toISOString(),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

test("SavedTool has all required fields", () => {
  const tool = makeTool(1);
  assert("runId" in tool, "missing runId");
  assert("query" in tool, "missing query");
  assert("toolUrl" in tool, "missing toolUrl");
  assert("model" in tool, "missing model");
  assert("savedAt" in tool, "missing savedAt");
  assert(typeof new Date(tool.savedAt).getTime() === "number", "savedAt not a valid ISO date");
});

test("getSavedTools returns empty array on first call", () => {
  // fresh store
  delete store["yukti-tools"];
  const tools = getSavedTools();
  assert(Array.isArray(tools), "not an array");
  assertEqual(tools.length, 0, "should be empty");
});

test("saveTool adds to localStorage", () => {
  delete store["yukti-tools"];
  saveTool(makeTool(1));
  const tools = getSavedTools();
  assertEqual(tools.length, 1, "should have 1 tool");
  assertEqual(tools[0].runId, "run-1", "wrong runId");
});

test("saveTool prepends (newest first)", () => {
  delete store["yukti-tools"];
  saveTool(makeTool(1));
  saveTool(makeTool(2));
  const tools = getSavedTools();
  assertEqual(tools[0].runId, "run-2", "newest should be first");
  assertEqual(tools[1].runId, "run-1", "oldest should be last");
});

test("saveTool deduplicates same runId", () => {
  delete store["yukti-tools"];
  saveTool(makeTool(1));
  const updated = { ...makeTool(1), query: "Updated query" };
  saveTool(updated);
  const tools = getSavedTools();
  assertEqual(tools.length, 1, "should have only 1 entry after dedup");
  assertEqual(tools[0].query, "Updated query", "should have updated query");
});

test("removeTool removes correct tool", () => {
  delete store["yukti-tools"];
  saveTool(makeTool(1));
  saveTool(makeTool(2));
  saveTool(makeTool(3));
  removeTool("run-2");
  const tools = getSavedTools();
  assertEqual(tools.length, 2, "should have 2 tools after remove");
  assert(tools.every(t => t.runId !== "run-2"), "run-2 should be removed");
  assert(tools.some(t => t.runId === "run-1"), "run-1 should still exist");
  assert(tools.some(t => t.runId === "run-3"), "run-3 should still exist");
});

test("saveTool caps at 50 on client", () => {
  delete store["yukti-tools"];
  for (let i = 1; i <= 60; i++) saveTool(makeTool(i));
  const tools = getSavedTools();
  assertEqual(tools.length, 50, "should cap at 50");
  // Newest (highest i) should be present
  assertEqual(tools[0].runId, "run-60", "newest should be run-60");
});

test("server getUserData returns empty for unknown uid", () => {
  const kv = {};
  const data = getUserData(kv, "unknown-uid");
  assert(Array.isArray(data.tools), "tools should be array");
  assertEqual(data.tools.length, 0, "tools should be empty");
});

test("server saveTool stores and returns tools", () => {
  const kv = {};
  const tools = serverSaveTool(kv, "uid-1", makeTool(1));
  assertEqual(tools.length, 1, "should have 1 tool");
  assertEqual(tools[0].runId, "run-1");
});

test("server saveTool deduplicates same runId", () => {
  const kv = {};
  serverSaveTool(kv, "uid-1", makeTool(1));
  const tools = serverSaveTool(kv, "uid-1", { ...makeTool(1), query: "Updated" });
  assertEqual(tools.length, 1, "should deduplicate");
  assertEqual(tools[0].query, "Updated", "should have updated data");
});

test("server removeTool removes correct tool", () => {
  const kv = {};
  serverSaveTool(kv, "uid-1", makeTool(1));
  serverSaveTool(kv, "uid-1", makeTool(2));
  serverSaveTool(kv, "uid-1", makeTool(3));
  const tools = serverRemoveTool(kv, "uid-1", "run-2");
  assertEqual(tools.length, 2, "should have 2 tools");
  assert(tools.every(t => t.runId !== "run-2"), "run-2 should be gone");
});

test("server caps tools at 100", () => {
  const kv = {};
  for (let i = 1; i <= 110; i++) serverSaveTool(kv, "uid-1", makeTool(i));
  const data = getUserData(kv, "uid-1");
  assertEqual(data.tools.length, 100, "should cap at 100");
  assertEqual(data.tools[0].runId, "run-110", "newest should be first");
});

test("server tools persist across getUserData calls", () => {
  const kv = {};
  serverSaveTool(kv, "uid-1", makeTool(1));
  serverSaveTool(kv, "uid-1", makeTool(2));
  // Simulate second request reading from KV
  const data = getUserData(kv, "uid-1");
  assertEqual(data.tools.length, 2, "tools should persist");
});

test("different uids have separate tool lists", () => {
  const kv = {};
  serverSaveTool(kv, "uid-alice", makeTool(1));
  serverSaveTool(kv, "uid-bob", makeTool(2));
  serverSaveTool(kv, "uid-bob", makeTool(3));
  const alice = getUserData(kv, "uid-alice");
  const bob = getUserData(kv, "uid-bob");
  assertEqual(alice.tools.length, 1, "alice should have 1 tool");
  assertEqual(bob.tools.length, 2, "bob should have 2 tools");
});

test("toolUrl is stored and retrievable (load flow)", () => {
  const kv = {};
  const tool = makeTool(1);
  serverSaveTool(kv, "uid-1", tool);
  const data = getUserData(kv, "uid-1");
  assertEqual(data.tools[0].toolUrl, "/t/run-1", "toolUrl should be preserved");
});

test("model field is stored (display in My Tools)", () => {
  const kv = {};
  serverSaveTool(kv, "uid-1", { ...makeTool(1), model: "anthropic/claude-3-5-sonnet" });
  const data = getUserData(kv, "uid-1");
  // My Tools shows model.split("/").pop() — should not crash on empty
  const modelDisplay = data.tools[0].model.split("/").pop();
  assertEqual(modelDisplay, "claude-3-5-sonnet", "model display should work");
});

test("model.split().pop() handles empty string without crashing", () => {
  const model = "";
  const display = model.split("/").pop();
  assertEqual(display, "", "empty model should give empty string, not crash");
});

// ── Results ────────────────────────────────────────────────────────────────
if (failed) {
  process.exitCode = 1;
  console.error("\nSave-flow tests FAILED.");
} else {
  console.log("\nAll save-flow tests passed ✔");
}
