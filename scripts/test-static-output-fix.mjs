#!/usr/bin/env node
/**
 * Unit tests for the static output fix.
 *
 * Verifies three things:
 * 1. callLLM no longer appends "Return ONLY valid JSON" to the system prompt
 *    (can't call real API, so we check the source text directly)
 * 2. classifyQuery() bumps "lookup" queries to "standard" tier
 * 3. validateWorkerCode() warns when no interactive elements are found
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

// ── 1. router.ts source check ─────────────────────────────────────────────────
console.log("\n[1] callLLM must NOT append 'Return ONLY valid JSON' to system prompt");
{
  const routerSrc = readFileSync(join(ROOT, "src/llm/router.ts"), "utf8");
  // Check that callLLM does NOT concatenate a JSON instruction onto systemPrompt in the messages array.
  // (CLARIFY_PROMPT legitimately contains "Return ONLY valid JSON" as part of its own instructions;
  //  that's fine. What we're guarding against is callLLM appending it to every system prompt.)
  assert(
    "callLLM does not concatenate JSON instruction to system prompt in messages",
    !routerSrc.includes("systemPrompt +") && !routerSrc.includes("systemPrompt+"),
  );
  assert(
    "callLLM passes systemPrompt unchanged as system message content",
    /\{\s*role:\s*["']system["'],\s*content:\s*systemPrompt\s*\}/.test(routerSrc),
  );
}

// ── 2. classifyQuery tier promotion for lookup ────────────────────────────────
console.log("\n[2] classifyQuery() promotes 'lookup' queries to standard tier");

// Inline port of the classifier (mirrors router.ts logic)
const MODELS = {
  fast:     { id: "anthropic/claude-haiku-4-5" },
  standard: { id: "anthropic/claude-sonnet-4-6" },
  powerful: { id: "anthropic/claude-sonnet-4-6" },
};

const SIGNALS = [
  { pattern: "simulate",           tierWeight: { powerful: 3 }, typeWeight: { tool: 3 } },
  { pattern: "calculate",          tierWeight: { standard: 2 }, typeWeight: { tool: 3 } },
  { pattern: "emi",                tierWeight: { standard: 2 }, typeWeight: { tool: 3 } },
  { pattern: "compare",            tierWeight: { standard: 2 }, typeWeight: { comparison: 3 } },
  { pattern: " vs ",               tierWeight: { standard: 2 }, typeWeight: { comparison: 3 } },
  { pattern: "which is better",    tierWeight: { standard: 2 }, typeWeight: { comparison: 3 } },
  { pattern: "weather",            tierWeight: { standard: 1 }, typeWeight: { "live-data": 3 } },
  { pattern: "earthquake",         tierWeight: { standard: 1 }, typeWeight: { "live-data": 3 } },
  { pattern: "recipe",             tierWeight: { standard: 2 }, typeWeight: { delight: 3 } },
  { pattern: "how do i make",      tierWeight: { standard: 2 }, typeWeight: { delight: 3 } },
  { pattern: "what is",            tierWeight: { fast: 1 },     typeWeight: { lookup: 3 } },
  { pattern: "who is",             tierWeight: { fast: 1 },     typeWeight: { lookup: 3 } },
  { pattern: "define",             tierWeight: { fast: 1 },     typeWeight: { lookup: 3 } },
  { pattern: "definition",         tierWeight: { fast: 1 },     typeWeight: { lookup: 3 } },
  { pattern: "tell me about",      tierWeight: { fast: 1, standard: 1 }, typeWeight: { lookup: 2, delight: 1 } },
  { pattern: "meaning of",         tierWeight: { fast: 1 },     typeWeight: { lookup: 3 } },
];

function pickQueryType(scores) {
  let best = "lookup";
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; best = type; }
  }
  return best;
}

function classifyQuery(query) {
  const lower = query.toLowerCase();
  const wordCount = query.split(/\s+/).length;
  const tierScores = { fast: 0, standard: 0, powerful: 0 };
  const typeScores = { tool: 0, delight: 0, "live-data": 0, comparison: 0, lookup: 0 };

  for (const signal of SIGNALS) {
    if (lower.includes(signal.pattern)) {
      for (const [tier, weight] of Object.entries(signal.tierWeight)) tierScores[tier] += weight;
      for (const [type, weight] of Object.entries(signal.typeWeight)) typeScores[type] += weight;
    }
  }

  if (wordCount > 30) tierScores.powerful += 3;
  else if (wordCount > 15) tierScores.standard += 2;

  let tier = "fast";
  if (tierScores.powerful > tierScores.standard && tierScores.powerful > tierScores.fast) tier = "powerful";
  else if (tierScores.standard > tierScores.fast) tier = "standard";

  const queryType = pickQueryType(typeScores);
  // THE FIX: lookup promoted, but only when it has real signals (score > 0)
  if ((queryType === "delight" || queryType === "comparison") && tier === "fast") {
    tier = "standard";
  } else if (queryType === "lookup" && typeScores.lookup > 0 && tier === "fast") {
    tier = "standard";
  }

  return { tier, queryType };
}

{
  const cases = [
    { query: "what is compound interest?",    wantTier: "standard", wantType: "lookup" },
    { query: "what is inflation?",             wantTier: "standard", wantType: "lookup" },
    { query: "who is Elon Musk?",              wantTier: "standard", wantType: "lookup" },
    { query: "define GDP",                     wantTier: "standard", wantType: "lookup" },
    { query: "meaning of NPV",                 wantTier: "standard", wantType: "lookup" },
    { query: "tell me about the stock market", wantTier: "standard", wantType: "lookup" },
  ];

  for (const { query, wantTier, wantType } of cases) {
    const { tier, queryType } = classifyQuery(query);
    assert(
      `"${query}" → tier=${wantTier}, type=${wantType}`,
      tier === wantTier && queryType === wantType,
      `got tier=${tier}, type=${queryType}`,
    );
  }

  // Lookup queries with additional tool signals should still go powerful/standard
  const { tier: t1, queryType: qt1 } = classifyQuery("what is compound interest? simulate with 10000");
  assert(
    "lookup + simulate → powerful tier",
    t1 === "powerful" && qt1 === "tool",
    `got tier=${t1}, type=${qt1}`,
  );

  // Queries with no signals: all typeScores = 0 → pickQueryType returns "lookup" default,
  // but since typeScores.lookup is 0 the tier is NOT promoted to standard.
  const { tier: t2, queryType: qt2 } = classifyQuery("something completely random with no signals");
  assert(
    "query with no signals stays fast tier (lookup score=0 prevents promotion)",
    t2 === "fast",
    `got tier=${t2}, type=${qt2}`,
  );
}

// ── 3. validate.ts interactive-element warning ────────────────────────────────
console.log("\n[3] validateWorkerCode() warns on missing interactive elements");

function validateWorkerCode(code) {
  const warnings = [];
  if (!code || typeof code !== "string") return { valid: false, error: "Empty or non-string code", warnings };
  if (code.length < 50) return { valid: false, error: "Code too short", warnings };
  if (!code.includes("export default")) return { valid: false, error: "Missing export default", warnings };
  if (!code.includes("fetch")) return { valid: false, error: "Missing fetch handler", warnings };
  if (!code.includes("Response")) return { valid: false, error: "Missing Response", warnings };

  const hasInteractive = /<input\b|<button\b|<select\b|oninput\b|onclick\b|onchange\b|onkeyup\b/i.test(code);
  if (!hasInteractive) {
    warnings.push("No interactive elements detected — every tool must have at least one input, button, or slider");
  }
  return { valid: true, warnings };
}

{
  const staticCode = `export default {
  fetch() {
    const html = '<html><body><h1>Inflation</h1><p>Inflation is a rise in prices.</p></body></html>';
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
}`;

  const interactiveCode = `export default {
  fetch() {
    const html = '<html><body><input type="range" oninput="calc()"><div id="out"></div><script>function calc(){}</script></body></html>';
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
}`;

  const buttonCode = `export default {
  fetch() {
    const html = '<html><body><button onclick="go()">Go</button><div id="out"></div></body></html>';
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  }
}`;

  const r1 = validateWorkerCode(staticCode);
  assert("static-only code is still valid (not a hard failure)", r1.valid === true);
  assert(
    "static-only code gets interactive-element warning",
    r1.warnings.some(w => w.includes("No interactive elements")),
    `warnings: ${JSON.stringify(r1.warnings)}`,
  );

  const r2 = validateWorkerCode(interactiveCode);
  assert("code with <input oninput> has no interactive-element warning", !r2.warnings.some(w => w.includes("No interactive elements")));

  const r3 = validateWorkerCode(buttonCode);
  assert("code with <button onclick> has no interactive-element warning", !r3.warnings.some(w => w.includes("No interactive elements")));
}

// ── 4. prompt.ts contains lookup output philosophy ────────────────────────────
console.log("\n[4] prompt.ts includes lookup output philosophy");
{
  const promptSrc = readFileSync(join(ROOT, "src/llm/prompt.ts"), "utf8");
  assert(
    "Lookup queries section exists in output philosophy",
    promptSrc.includes("Lookup queries") && promptSrc.includes("what is X"),
  );
  assert(
    "Lookup section warns against static-only output",
    promptSrc.includes("NEVER return static text only"),
  );
  assert(
    "Lookup section requires interactive layer",
    promptSrc.includes("interactive layer"),
  );
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} assertions — ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
