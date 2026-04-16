#!/usr/bin/env node
/**
 * Unit test for Mobile (390px) layout — back button, save/share, My Tools actions.
 *
 * Tests:
 *  1. Mobile header has a back button that calls resetToHome
 *  2. Back button has adequate touch target (p-2 or min-w-[44px])
 *  3. Mobile bottom bar renders Save and Share when toolUrl is present
 *  4. Mobile bottom bar Save/Share show state feedback (Saved/Copied)
 *  5. Mobile bottom bar has Refine and Info buttons
 *  6. My Tools actions are visible on mobile (not opacity-0 by default on small screens)
 *  7. Tool stage wrapper has enough bottom padding on mobile to clear the fixed bottom bar
 *  8. safe-area-bottom CSS class is defined
 *  9. Mobile refine sheet closes on backdrop click
 * 10. Mobile inspector sheet closes on backdrop click
 * 11. Example cards use grid-cols-2 on mobile
 * 12. Onboarding CTA button has large vertical padding for mobile tap
 * 13. Mobile header query text truncates with 'truncate' class
 * 14. Right panel flex-1 makes tool area fill remaining height on mobile
 *
 * Run: node scripts/test-mobile-layout.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// ── Load source files ─────────────────────────────────────────────────────────
const clientSrc = fs.readFileSync(path.join(__dirname, "../src/client.tsx"), "utf8");
const stylesSrc = fs.readFileSync(path.join(__dirname, "../src/styles.css"), "utf8");

// ── Helper: get mobile bottom bar chunk ──────────────────────────────────────
// Use comment anchor for reliability; fall back to class anchor
function getBottomBarChunk(size = 4000) {
  const commentIdx = clientSrc.indexOf("Mobile bottom action bar");
  const classIdx = clientSrc.indexOf("md:hidden fixed bottom-0");
  const idx = commentIdx !== -1 ? commentIdx : classIdx;
  assert(idx !== -1, "Mobile bottom action bar not found in source");
  return clientSrc.slice(idx, idx + size);
}

// ── 1. Mobile header back button ──────────────────────────────────────────────
test("Mobile header present with back button calling resetToHome", () => {
  assert(clientSrc.includes("md:hidden sticky top-0"), "Mobile header div not found");
  assert(clientSrc.includes('onClick={resetToHome}'), "resetToHome not wired to any element");
});

// ── 2. Back button touch target ≥ 44px ───────────────────────────────────────
test("Mobile back button (in header) has adequate touch target", () => {
  // The mobile header back button is a <button type="button"> calling resetToHome.
  // The desktop one is an <h1>. Find the button variant.
  const btnMatch = clientSrc.match(/<button\s+type="button"\s+onClick=\{resetToHome\}\s+className="([^"]+)"/);
  assert(btnMatch, "Cannot find <button type=\"button\" onClick={resetToHome}> in mobile header");
  const cls = btnMatch[1];
  assert(
    cls.includes("p-2") || cls.includes("p-3") || cls.includes("p-4") || cls.includes("min-w-[44"),
    `Back button touch target too small: "${cls}". Need at least p-2 or min-w-[44px].`
  );
});

// ── 3. Mobile bottom bar has Save + Share ─────────────────────────────────────
test("Mobile bottom bar renders Save button", () => {
  const chunk = getBottomBarChunk();
  assert(chunk.includes("Save"), "Save button text missing in mobile bottom bar");
});

test("Mobile bottom bar renders Share button", () => {
  const chunk = getBottomBarChunk();
  // "Share" appears inside the JSX span: {copied ? "Copied" : "Share"}
  assert(chunk.includes('"Share"'), "Share button text missing in mobile bottom bar");
});

// ── 4. Save/Share state feedback ─────────────────────────────────────────────
test("Save button shows 'Saved' state text on mobile", () => {
  const chunk = getBottomBarChunk();
  assert(chunk.includes("Saved"), "Save feedback text 'Saved' missing in mobile bottom bar");
});

test("Share button shows 'Copied' state text on mobile", () => {
  const chunk = getBottomBarChunk();
  assert(chunk.includes('"Copied"'), "Share feedback text 'Copied' missing in mobile bottom bar");
});

// ── 5. Mobile bottom bar has Refine + Info ────────────────────────────────────
test("Mobile bottom bar has Refine button", () => {
  const chunk = getBottomBarChunk();
  assert(chunk.includes("Refine"), "Refine button missing in mobile bottom bar");
});

test("Mobile bottom bar has Info button", () => {
  const chunk = getBottomBarChunk();
  assert(chunk.includes(">Info<"), "Info button text missing in mobile bottom bar");
});

// ── 6. My Tools actions visible on mobile (not hidden by hover-only) ──────────
test("My Tools Fork button not hidden by opacity-0 on mobile (uses md:opacity-0)", () => {
  // Fork button: >Fork</button> — check the className on the button before it
  const forkBtnClassMatch = clientSrc.match(/className="([^"]+)"\s*\n?\s*title="Regenerate with same query"/);
  assert(forkBtnClassMatch, "Fork button className not found (should have title='Regenerate with same query')");
  const cls = forkBtnClassMatch[1];
  assert(!cls.match(/(?:^|\s)opacity-0(?:\s|$)/),
    `Fork button has plain opacity-0 (invisible on mobile). Use md:opacity-0 instead. Got: "${cls}"`);
});

test("My Tools Share button not hidden by opacity-0 on mobile (uses md:opacity-0)", () => {
  const shareClassMatch = clientSrc.match(/className="([^"]+)"\s*\n?\s*title="Copy share link"/);
  assert(shareClassMatch, "My Tools Share button className not found (should have title='Copy share link')");
  const cls = shareClassMatch[1];
  assert(!cls.match(/(?:^|\s)opacity-0(?:\s|$)/),
    `Share button has plain opacity-0 (invisible on mobile). Use md:opacity-0 instead. Got: "${cls}"`);
});

test("My Tools Remove button not hidden by opacity-0 on mobile (uses md:opacity-0)", () => {
  const removeClassMatch = clientSrc.match(/className="([^"]+)"\s*\n?\s*title="Remove"/);
  assert(removeClassMatch, "My Tools Remove button className not found (should have title='Remove')");
  const cls = removeClassMatch[1];
  assert(!cls.match(/(?:^|\s)opacity-0(?:\s|$)/),
    `Remove button has plain opacity-0 (invisible on mobile). Use md:opacity-0 instead. Got: "${cls}"`);
});

// ── 7. Tool stage bottom padding avoids bottom bar overlap ────────────────────
test("tool-stage-wrapper has ≥ 4rem (64px) bottom padding in mobile media query", () => {
  const mobileMediaBlock = stylesSrc.match(/@media \(max-width: 768px\)\s*\{[\s\S]+?\}/)?.[0];
  assert(mobileMediaBlock, "Mobile media query not found in styles.css");
  assert(mobileMediaBlock.includes("padding-bottom"), "No padding-bottom in mobile .tool-stage-wrapper");

  const pbMatch = mobileMediaBlock.match(/padding-bottom:\s*([\d.]+)(rem|px)/);
  assert(pbMatch, "Cannot parse padding-bottom value from mobile media query");
  const val = parseFloat(pbMatch[1]);
  const unit = pbMatch[2];
  const px = unit === "rem" ? val * 16 : val;
  assert(px >= 64, `padding-bottom is ${px}px, need ≥ 64px to clear the fixed bottom bar`);
});

// ── 8. safe-area-bottom CSS is defined ───────────────────────────────────────
test("safe-area-bottom class defined in styles.css", () => {
  assert(stylesSrc.includes(".safe-area-bottom"), ".safe-area-bottom class not defined in styles.css");
  assert(stylesSrc.includes("safe-area-inset-bottom"), ".safe-area-bottom doesn't use env(safe-area-inset-bottom)");
});

// ── 9. Mobile refine sheet closes on backdrop click ───────────────────────────
test("Mobile refine sheet has backdrop click to close", () => {
  const refineSheetBlock = clientSrc.match(/mobileRefineOpen && \([\s\S]{0,1500}/)?.[0];
  assert(refineSheetBlock, "Mobile refine sheet block not found");
  assert(refineSheetBlock.includes("setMobileRefineOpen(false)"), "Backdrop click handler missing from refine sheet");
});

// ── 10. Mobile inspector sheet closes on backdrop click ───────────────────────
test("Mobile inspector sheet has backdrop click to close", () => {
  assert(clientSrc.includes("setShowInspector(false)"), "setShowInspector(false) not found");
});

// ── 11. Example cards use 2-column grid on mobile ─────────────────────────────
test("Example cards use grid-cols-2 on mobile, grid-cols-4 on desktop", () => {
  assert(clientSrc.includes("grid-cols-2 md:grid-cols-4"), "Example cards should use grid-cols-2 on mobile");
});

// ── 12. Onboarding CTA has large touch target ─────────────────────────────────
test("Onboarding CTA button has py-4 or larger for mobile tap target", () => {
  // The CTA button className is "px-10 py-4 text-lg font-semibold..."
  assert(
    clientSrc.includes("py-4") || clientSrc.includes("py-5") || clientSrc.includes("py-6"),
    "No py-4+ found in source"
  );
  // Specifically check near 'Try it yourself'
  const ctaIdx = clientSrc.indexOf("Try it yourself");
  assert(ctaIdx !== -1, "Onboarding CTA 'Try it yourself' text not found");
  // The button's className can be up to ~600 chars before the visible text due to the onClick handler
  const ctaCtx = clientSrc.slice(ctaIdx - 600, ctaIdx + 20);
  assert(
    ctaCtx.includes("py-4") || ctaCtx.includes("py-5") || ctaCtx.includes("py-6"),
    "Onboarding CTA button needs py-4 minimum for mobile tap. Check className near 'Try it yourself'."
  );
});

// ── 13. Mobile header query text truncates ────────────────────────────────────
test("Mobile header query preview has 'truncate' class", () => {
  const headerQueryBlock = clientSrc.match(/query && html && !loading[\s\S]{0,200}/)?.[0];
  assert(headerQueryBlock, "Mobile header query preview not found");
  assert(headerQueryBlock.includes("truncate"), "Missing 'truncate' class on mobile header query text");
});

// ── 14. Right panel fills height on mobile ────────────────────────────────────
test("Right panel has flex-1 to fill available height on mobile", () => {
  assert(clientSrc.includes("flex-1 bg-white flex flex-col"), "Right panel missing flex-1");
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log();
if (failed) {
  console.error("Some tests failed. See above for details.");
  process.exit(1);
} else {
  console.log("All mobile layout assertions passed.");
}
