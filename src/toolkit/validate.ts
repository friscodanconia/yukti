/**
 * Validation for LLM-generated Worker code.
 * Catches structural issues and dangerous patterns before loading into the sandbox.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings: string[];
}

/** Patterns that must cause immediate validation failure. */
const BANNED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\beval\s*\(/, reason: "eval() — code execution not allowed" },
  { pattern: /\bnew\s+Function\s*\(/, reason: "new Function() — code execution not allowed" },
  { pattern: /\bimportScripts\s*\(/, reason: "importScripts() — script injection not allowed" },
  { pattern: /\bprocess\.env\b/, reason: "process.env — environment access not allowed" },
  { pattern: /\bglobalThis\.fetch\s*=/, reason: "globalThis.fetch override not allowed" },
  { pattern: /\bself\.fetch\s*=/, reason: "self.fetch override not allowed" },
  { pattern: /\bcrypto\.subtle\b/, reason: "crypto.subtle — crypto access not allowed" },
  { pattern: /\bnew\s+WebSocket\s*\(/, reason: "WebSocket — bypasses fetch guard, not allowed" },
  { pattern: /\bXMLHttpRequest\b/, reason: "XMLHttpRequest — bypasses fetch guard, not allowed" },
];

/** Maximum code size in bytes (50 KB). */
const MAX_CODE_SIZE = 50 * 1024;

export function validateWorkerCode(code: string): ValidationResult {
  const warnings: string[] = [];

  if (!code || typeof code !== "string") {
    return { valid: false, error: "Empty or non-string code", warnings };
  }

  if (code.length < 50) {
    return { valid: false, error: "Code too short — likely incomplete generation", warnings };
  }

  // Size limit — guard against LLM runaway
  if (code.length > MAX_CODE_SIZE) {
    return { valid: false, error: `Code exceeds ${MAX_CODE_SIZE / 1024}KB limit (${(code.length / 1024).toFixed(1)}KB) — likely LLM runaway`, warnings };
  }

  // Structural checks
  if (!code.includes("export default")) {
    return { valid: false, error: "Missing 'export default' — must export a Worker module", warnings };
  }

  if (!code.includes("fetch")) {
    return { valid: false, error: "Missing 'fetch' handler — Worker must handle fetch events", warnings };
  }

  if (!code.includes("Response")) {
    return { valid: false, error: "Missing 'Response' — Worker must return a Response object", warnings };
  }

  // HTML presence check — the Worker should return HTML content
  const hasHTML = code.includes("<!DOCTYPE") || code.includes("<html") || code.includes("<body") || code.includes("<h1");
  if (!hasHTML) {
    warnings.push("No HTML markup detected — Worker may not return a visible page");
  }

  // Banned pattern checks — hard failures
  // Skip the fetch-override check inside our own injected guard (lines that reference __originalFetch)
  const codeWithoutGuard = code.replace(/const __originalFetch[\s\S]*?__originalFetch\(input, init\);\s*\};/g, "");
  for (const { pattern, reason } of BANNED_PATTERNS) {
    if (pattern.test(codeWithoutGuard)) {
      return { valid: false, error: `Banned pattern: ${reason}`, warnings };
    }
  }

  // Fetch count warning
  const fetchCalls = (code.match(/\bfetch\s*\(/g) || []).length;
  if (fetchCalls > 10) {
    warnings.push(`High fetch() call count (${fetchCalls}) — likely over-engineering`);
  }

  // Fetch fallback check — if the code fetches data, it should have fallbacks
  if (code.includes("await fetch(") || code.includes("await fetch (")) {
    if (!code.includes("catch") && !code.includes("try")) {
      warnings.push("Contains fetch() without try/catch — may fail without fallback data");
    }
  }

  // Interactive element check — static-only output violates prompt rules
  const hasInteractive = /<input\b|<button\b|<select\b|oninput\b|onclick\b|onchange\b|onkeyup\b/i.test(code);
  if (!hasInteractive) {
    warnings.push("No interactive elements detected — every tool must have at least one input, button, or slider");
  }

  // Template literal check — common LLM mistake
  const backtickCount = (code.match(/`/g) || []).length;
  if (backtickCount > 10) {
    // Nested template literals are the #1 cause of syntax errors
    warnings.push("High backtick count (" + backtickCount + ") — nested template literals may cause syntax errors");
  }

  return { valid: true, warnings };
}

/**
 * Sanitize generated code by stripping external CDN <script src=...> tags.
 * The prompt tells LLMs not to use CDN imports, but this enforces it.
 */
export function sanitizeCode(code: string): string {
  // Remove <script src="..."> tags pointing to external URLs
  return code.replace(/<script\s+[^>]*src\s*=\s*["'][^"']*["'][^>]*>\s*<\/script>/gi, "<!-- CDN script removed by sanitizer -->");
}

/**
 * Inject base CSS (and optional script) into the HTML returned by the Dynamic Worker.
 * The script is injected as a deferred inline <script> before </body> so it runs
 * after the page's own JavaScript has set up DOM structure.
 */
export function injectBaseCSS(html: string, css: string, script?: string): string {
  const styleTag = `<style>${css}</style>`;
  const scriptTag = script ? `<script>${script}</script>` : "";

  if (html.includes("</head>") && html.includes("</body>")) {
    return html
      .replace("</head>", styleTag + "</head>")
      .replace("</body>", scriptTag + "</body>");
  }

  if (html.includes("</head>")) {
    return html.replace("</head>", styleTag + "</head>") + scriptTag;
  }

  if (!html.includes("<!DOCTYPE") && !html.includes("<html")) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styleTag}</head><body>${html}${scriptTag}</body></html>`;
  }

  return html.replace(/<html[^>]*>/, match => match + `<head>${styleTag}</head>`) + scriptTag;
}
