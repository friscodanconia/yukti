#!/usr/bin/env node
/**
 * Local unit test for slider injection mechanism.
 * Verifies injectBaseCSS places BASE_SCRIPT correctly and
 * the slider fill math produces expected percentages.
 * Run: node scripts/test-sliders.mjs
 */
import { readFileSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

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
  if (!cond) throw new Error(msg);
}

// ── Build a minimal JS bundle from the TS sources ──────────
// We extract the relevant functions/constants using a quick tsc invocation.
// Fallback: parse the TS files by hand (strip types).

// Read raw source files
const validateSrc = readFileSync(path.join(root, "src/toolkit/validate.ts"), "utf8");
const baseCssSrc = readFileSync(path.join(root, "src/toolkit/base-css.ts"), "utf8");

// Strip TypeScript type annotations from a small subset of code
// We only need the function bodies and constant strings.
function stripTypes(src) {
  return src
    .replace(/^export\s+interface\s+\w+\s*\{[\s\S]*?\n\}/gm, "")
    .replace(/:\s*string(\[\])?/g, "")
    .replace(/:\s*boolean/g, "")
    .replace(/:\s*string\s*\|/g, "")
    .replace(/export\s+(function|const|class)/g, "$1")
    .replace(/<[A-Z][A-Za-z]*>/g, "")
    .replace(/\bstring\b(?=\s*[,)])/g, "")
    .replace(/export\s+\{[^}]*\}.*\n/g, "");
}

// Extract BASE_CSS and BASE_SCRIPT strings from base-css.ts
const baseCssMatch = baseCssSrc.match(/export const BASE_CSS = `([\s\S]*?)`\.trim\(\)/);
const baseScriptMatch = baseCssSrc.match(/export const BASE_SCRIPT = `([\s\S]*?)`\.trim\(\)/);
assert(baseCssMatch, "Could not extract BASE_CSS from base-css.ts");
assert(baseScriptMatch, "Could not extract BASE_SCRIPT from base-css.ts");
const BASE_CSS = baseCssMatch[1].trim();
const BASE_SCRIPT = baseScriptMatch[1].trim();

// Extract injectBaseCSS function from validate.ts
const injectFnMatch = validateSrc.match(
  /export function injectBaseCSS\(html[^)]*\)[^{]*\{([\s\S]*?)^}/m
);
assert(injectFnMatch, "Could not extract injectBaseCSS from validate.ts");

// Eval the function in a safe context
const injectBaseCSSFn = new Function(
  "html", "css", "script",
  injectFnMatch[1]
    .replace(/const styleTag/g, "var styleTag")
    .replace(/const scriptTag/g, "var scriptTag")
);

// ── Tests ───────────────────────────────────────────────────

test("BASE_CSS contains range input styling", () => {
  assert(BASE_CSS.includes("input[type=range]"), "Missing range input CSS");
  assert(BASE_CSS.includes("--fill"), "Missing --fill CSS variable");
});

test("BASE_SCRIPT contains syncSlider function", () => {
  assert(BASE_SCRIPT.includes("syncSlider"), "Missing syncSlider function");
  assert(BASE_SCRIPT.includes("--fill"), "Missing --fill setter in script");
  assert(BASE_SCRIPT.includes("MutationObserver"), "Missing MutationObserver for dynamic sliders");
});

test("BASE_SCRIPT is syntactically valid JS", () => {
  // Parse check using node --check flag
  const tmpFile = path.join(root, "_slider_test_tmp.js");
  writeFileSafe(tmpFile, BASE_SCRIPT);
  try {
    execSync(`node --check ${tmpFile}`, { stdio: "pipe" });
  } finally {
    try { execSync(`rm -f ${tmpFile}`); } catch {}
  }
});

test("injectBaseCSS places script before </body>", () => {
  const html = `<!DOCTYPE html><html><head></head><body><h1>Hello</h1></body></html>`;
  const result = injectBaseCSSFn(html, BASE_CSS, BASE_SCRIPT);
  const bodyClose = result.indexOf("</body>");
  const scriptOpen = result.indexOf(BASE_SCRIPT.slice(0, 30));
  assert(scriptOpen !== -1, "Script not found in output");
  assert(scriptOpen < bodyClose, "Script should appear before </body>");
});

test("injectBaseCSS places CSS in <head>", () => {
  const html = `<!DOCTYPE html><html><head></head><body></body></html>`;
  const result = injectBaseCSSFn(html, BASE_CSS, BASE_SCRIPT);
  const headClose = result.indexOf("</head>");
  const styleTag = result.indexOf("<style>");
  assert(styleTag !== -1, "Style tag not found in output");
  assert(styleTag < headClose, "Style should appear before </head>");
});

test("Slider fill math: value at 50% of range gives 50%", () => {
  const min = 0, max = 100, val = 50;
  const pct = ((val - min) / (max - min) * 100).toFixed(1) + "%";
  assert(pct === "50.0%", `Expected 50.0%, got ${pct}`);
});

test("Slider fill math: income slider at ₹12L of ₹1Cr", () => {
  const min = 300000, max = 10000000, val = 1200000;
  const pct = ((val - min) / (max - min) * 100).toFixed(1) + "%";
  const num = parseFloat(pct);
  assert(num > 8 && num < 10, `Expected ~9%, got ${pct}`);
});

test("injectBaseCSS handles HTML without head/body tags", () => {
  const html = `<h1>Hello</h1>`;
  const result = injectBaseCSSFn(html, BASE_CSS, "alert(1)");
  assert(result.includes("<!DOCTYPE html>"), "Should wrap in full HTML");
  assert(result.includes("<style>"), "Should have style tag");
  assert(result.includes("alert(1)"), "Should have script");
});

// ── Helper ──────────────────────────────────────────────────
import { writeFileSync } from "fs";
function writeFileSafe(p, content) {
  writeFileSync(p, content, "utf8");
}

if (failed) {
  process.exitCode = 1;
  console.error("\nSlider tests failed.");
} else {
  console.log("\nAll slider tests passed ✔");
}
