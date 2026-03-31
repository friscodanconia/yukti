#!/usr/bin/env node
const baseUrl = (process.env.SMOKE_BASE_URL || "https://yukti.soumyosinha.workers.dev").replace(/\/$/, "");
let failed = false;

async function runTest(name, fn) {
  const start = Date.now();
  try {
    const detail = await fn();
    const elapsed = Date.now() - start;
    console.log(`✅ ${name} (${elapsed}ms)` + (detail ? ` — ${detail}` : ""));
  } catch (err) {
    failed = true;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${name} — ${message}`);
  }
}

async function fetchJson(path, options = {}) {
  const res = await fetch(baseUrl + path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return res.json();
}

await runTest("Home page", async () => {
  const res = await fetch(baseUrl + "/");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html.toLowerCase().includes("interactive tools")) {
    throw new Error("Landing page copy missing expected tagline");
  }
  return `${res.status}`;
});

await runTest("Static tool smoke", async () => {
  const res = await fetch(baseUrl + "/api/test");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes("Income Tax Calculator")) {
    throw new Error("/api/test missing expected markup");
  }
});

await runTest("Clarify endpoint", async () => {
  const payload = { topic: "rent vs buy a home" };
  const res = await fetch(baseUrl + "/api/clarify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.action) throw new Error("Clarify response missing action");
  return data.action === "clarify" ? "needs follow-up" : "ready";
});

await runTest("Stats endpoint", async () => {
  const data = await fetchJson("/api/stats").catch((err) => {
    if (String(err.message || err).includes("kv")) {
      console.warn("⚠️  Stats endpoint unavailable (KV not configured). Skipping requirement.");
      return null;
    }
    throw err;
  });
  if (!data) {
    return "skipped";
  }
  if (typeof data.totalGenerations !== "number") {
    throw new Error("Unexpected stats payload");
  }
  return `runs ${data.totalGenerations} / success ${data.successRate}`;
});

if (failed) {
  process.exitCode = 1;
  console.error("Smoke tests failed.");
} else {
  console.log("All smoke tests passed ✔");
}
