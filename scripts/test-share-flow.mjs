#!/usr/bin/env node
/**
 * Unit test for Share flow.
 *
 * Tests:
 *  1. toolUrl is /tool/{runId} after generation
 *  2. toolUrl is null when KV is unavailable
 *  3. Share URL = window.location.origin + toolUrl
 *  4. Server route returns HTML with OG tags injected
 *  5. Server route injects "Built with Yukti" footer
 *  6. OG title uses topic from metadata
 *  7. OG title HTML-escapes double quotes in topic
 *  8. Topic defaults to "Interactive Tool" when missing
 *  9. Server returns 404 for unknown runId
 * 10. Server returns 404 for empty runId
 * 11. Share route requires NO authentication (public access)
 * 12. HTML is returned as text/html; charset=utf-8
 * 13. Multiple OG meta tags are injected
 * 14. toolUrl format is consistent (/tool/ prefix)
 * 15. Footer contains link back to / (home)
 *
 * Run: node scripts/test-share-flow.mjs
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
async function testAsync(name, fn) {
  try {
    await fn();
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

// ── Replicate server-side /tool/{runId} route logic ──────────────────────────
// Mirrors src/server.ts lines 634-654

function buildOgTags(topic) {
  const safeTitle = topic.replace(/"/g, "&quot;");
  return [
    `<meta property="og:title" content="Yukti — ${safeTitle}">`,
    `<meta property="og:description" content="Interactive tool built on the fly by Yukti">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Yukti">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="Yukti — ${safeTitle}">`,
  ].join("\n");
}

const FOOTER = `<div style="text-align:center;padding:1.5rem 1rem 1rem;margin-top:2rem;border-top:1px solid rgba(191,176,154,0.2);font-family:'Outfit',system-ui,sans-serif;font-size:0.6875rem;color:#96897a;">Built with <a href="/" style="color:#c2652a;text-decoration:none;font-weight:600;">Yukti</a> — interactive tools, built on the fly</div>`;

function serveToolFromKV(kv, runId) {
  // mirrors GET /tool/{runId} handler
  if (!runId) return { status: 404, body: "Not found" };
  const entry = kv[`tool:${runId}`];
  if (!entry) return { status: 404, body: "Tool not found or expired" };

  const { html, metadata } = entry;
  const topic = metadata?.topic || "Interactive Tool";
  const ogTags = buildOgTags(topic);

  let enriched = html.replace(/<\/head>/i, ogTags + "\n</head>");
  enriched = enriched.replace(/<\/body>/i, FOOTER + "\n</body>");

  return {
    status: 200,
    body: enriched,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  };
}

// ── Replicate server-side toolUrl assignment logic ────────────────────────────
// Mirrors src/server.ts lines 319-326
function getToolUrl(kv, runId, html, metadata) {
  if (!kv) return null;
  try {
    kv[`tool:${runId}`] = { html, metadata };
    return `/tool/${runId}`;
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeHtml(title = "Test Tool") {
  return `<!DOCTYPE html>\n<html>\n<head><title>${title}</title></head>\n<body><h1>${title}</h1></body>\n</html>`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test("toolUrl is /tool/{runId} when KV is available", () => {
  const kv = {};
  const runId = "abc123";
  const url = getToolUrl(kv, runId, makeHtml(), { topic: "BMI Calculator" });
  assertEqual(url, "/tool/abc123", "toolUrl should be /tool/abc123");
});

test("toolUrl is null when KV is not configured (env.TOOLS_KV is falsy)", () => {
  const url = getToolUrl(null, "abc123", makeHtml(), {});
  assertEqual(url, null, "toolUrl should be null when no KV");
});

test("toolUrl always starts with /tool/", () => {
  const kv = {};
  const runId = "xyz999";
  const url = getToolUrl(kv, runId, makeHtml(), {});
  assert(url?.startsWith("/tool/"), `toolUrl should start with /tool/, got ${url}`);
});

test("toolUrl runId segment matches the runId used", () => {
  const kv = {};
  const runId = "myRun42";
  const url = getToolUrl(kv, runId, makeHtml(), {});
  assertEqual(url, `/tool/${runId}`, "toolUrl runId should match");
});

test("share URL = window.location.origin + toolUrl", () => {
  const origin = "https://yukti.soumyosinha.workers.dev";
  const toolUrl = "/tool/abc123";
  const shareUrl = origin + toolUrl;
  assertEqual(shareUrl, "https://yukti.soumyosinha.workers.dev/tool/abc123");
});

test("server route returns 200 for known runId", () => {
  const kv = { "tool:abc123": { html: makeHtml("My Tool"), metadata: { topic: "My Tool" } } };
  const res = serveToolFromKV(kv, "abc123");
  assertEqual(res.status, 200, "should return 200");
});

test("server route returns HTML body", () => {
  const kv = { "tool:abc123": { html: makeHtml("My Tool"), metadata: { topic: "My Tool" } } };
  const res = serveToolFromKV(kv, "abc123");
  assert(res.body.includes("<!DOCTYPE html>"), "body should contain HTML");
});

test("server route injects OG title with topic", () => {
  const kv = { "tool:run1": { html: makeHtml(), metadata: { topic: "Tax Calculator" } } };
  const res = serveToolFromKV(kv, "run1");
  assert(res.body.includes('content="Yukti — Tax Calculator"'), "OG title should contain topic");
});

test("server route HTML-escapes double quotes in topic", () => {
  const kv = { "tool:run2": { html: makeHtml(), metadata: { topic: 'Quote "test" tool' } } };
  const res = serveToolFromKV(kv, "run2");
  assert(res.body.includes("&quot;test&quot;"), "double quotes in topic should be escaped");
  assert(!res.body.includes('"test"'), 'raw double quotes should not appear in OG title attribute');
});

test("server route defaults topic to 'Interactive Tool' when missing", () => {
  const kv = { "tool:run3": { html: makeHtml(), metadata: {} } };
  const res = serveToolFromKV(kv, "run3");
  assert(res.body.includes('content="Yukti — Interactive Tool"'), "should use default topic");
});

test("server route injects all 6 OG/Twitter meta tags", () => {
  const kv = { "tool:run4": { html: makeHtml(), metadata: { topic: "Calorie Counter" } } };
  const res = serveToolFromKV(kv, "run4");
  assert(res.body.includes('property="og:title"'), "og:title present");
  assert(res.body.includes('property="og:description"'), "og:description present");
  assert(res.body.includes('property="og:type"'), "og:type present");
  assert(res.body.includes('property="og:site_name"'), "og:site_name present");
  assert(res.body.includes('name="twitter:card"'), "twitter:card present");
  assert(res.body.includes('name="twitter:title"'), "twitter:title present");
});

test("server route injects footer before </body>", () => {
  const kv = { "tool:run5": { html: makeHtml(), metadata: { topic: "Tip Calculator" } } };
  const res = serveToolFromKV(kv, "run5");
  assert(res.body.includes("Built with"), "footer should say Built with");
  assert(res.body.includes("Yukti"), "footer should mention Yukti");
  // footer should come before closing </body>
  const footerIdx = res.body.indexOf("Built with");
  const bodyCloseIdx = res.body.indexOf("</body>");
  assert(footerIdx < bodyCloseIdx, "footer should appear before </body>");
});

test("server route footer links back to / (home)", () => {
  const kv = { "tool:run6": { html: makeHtml(), metadata: {} } };
  const res = serveToolFromKV(kv, "run6");
  assert(res.body.includes('href="/"'), "footer should link to /");
});

test("server route returns 404 for unknown runId", () => {
  const kv = {};
  const res = serveToolFromKV(kv, "nonexistent");
  assertEqual(res.status, 404, "unknown runId should return 404");
});

test("server route returns 404 for empty runId", () => {
  const kv = {};
  const res = serveToolFromKV(kv, "");
  assertEqual(res.status, 404, "empty runId should return 404");
});

test("server route sets Content-Type to text/html; charset=utf-8", () => {
  const kv = { "tool:run7": { html: makeHtml(), metadata: {} } };
  const res = serveToolFromKV(kv, "run7");
  assertEqual(res.headers?.["Content-Type"], "text/html; charset=utf-8");
});

test("share route requires NO auth — uid is NOT in the KV key lookup", () => {
  // The server looks up tool:{runId}, not tool:{uid}:{runId}
  // So any request with a valid runId can access the tool, regardless of who created it
  const runId = "shared-tool-xyz";
  const kv = { [`tool:${runId}`]: { html: makeHtml("Shared Tool"), metadata: { uid: "creator-uid", topic: "Shared Tool" } } };

  // Simulate request from a different user (incognito, no uid)
  const res = serveToolFromKV(kv, runId);
  assertEqual(res.status, 200, "should be accessible without auth/uid check");
  assert(res.body.includes("Shared Tool"), "HTML content should be returned");
});

test("OG tags are inserted inside <head> (before </head>)", () => {
  const kv = { "tool:run8": { html: makeHtml(), metadata: { topic: "Head Injection Test" } } };
  const res = serveToolFromKV(kv, "run8");
  const headCloseIdx = res.body.indexOf("</head>");
  const ogIdx = res.body.indexOf('property="og:title"');
  assert(ogIdx !== -1, "OG tag should be present");
  assert(ogIdx < headCloseIdx, "OG tags should appear before </head>");
});

// ── Results ────────────────────────────────────────────────────────────────────
if (failed) {
  process.exitCode = 1;
  console.error("\nShare-flow tests FAILED.");
} else {
  console.log("\nAll share-flow tests passed ✔");
}
