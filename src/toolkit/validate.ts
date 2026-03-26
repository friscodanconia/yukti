/**
 * Validation for LLM-generated Worker code.
 * Catches structural issues before loading into the sandbox.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings: string[];
}

export function validateWorkerCode(code: string): ValidationResult {
  const warnings: string[] = [];

  if (!code || typeof code !== "string") {
    return { valid: false, error: "Empty or non-string code", warnings };
  }

  if (code.length < 50) {
    return { valid: false, error: "Code too short — likely incomplete generation", warnings };
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
  if (!code.includes("<!DOCTYPE") && !code.includes("<html") && !code.includes("<body") && !code.includes("<h1")) {
    warnings.push("No HTML markup detected — Worker may not return a visible page");
  }

  // Script safety — check for dangerous patterns
  if (code.includes("eval(") || code.includes("Function(") && !code.includes("new Function")) {
    warnings.push("Contains eval() or Function() — potential security concern");
  }

  // Fetch fallback check — if the code fetches data, it should have fallbacks
  if (code.includes("await fetch(") || code.includes("await fetch (")) {
    if (!code.includes("catch") && !code.includes("try")) {
      warnings.push("Contains fetch() without try/catch — may fail without fallback data");
    }
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
 * Inject base CSS into the HTML returned by the Dynamic Worker.
 */
export function injectBaseCSS(html: string, css: string): string {
  const styleTag = `<style>${css}</style>`;

  if (html.includes("</head>")) {
    return html.replace("</head>", styleTag + "</head>");
  }

  if (!html.includes("<!DOCTYPE") && !html.includes("<html")) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styleTag}</head><body>${html}</body></html>`;
  }

  return html.replace(/<html[^>]*>/, match => match + `<head>${styleTag}</head>`);
}
