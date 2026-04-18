#!/usr/bin/env node
// Unit tests for the improved fixNestedBackticks() state machine parser.
// Extracted and ported from src/server.ts for standalone testing.

// ── re-implementations of the three helper functions ─────────────────────────

function scanPastString(code, start) {
  const q = code[start];
  let i = start + 1;
  while (i < code.length) {
    if (code[i] === '\\') { i += 2; continue; }
    if (code[i] === q) { i++; break; }
    i++;
  }
  return i;
}

function processTemplateLiteral(code, start) {
  let content = '';
  let i = start + 1;
  let exprDepth = 0;
  let scriptDepth = 0;

  while (i < code.length) {
    const c = code[i];

    if (c === '\\') {
      content += c + (code[i + 1] || '');
      i += 2;
      continue;
    }

    if (exprDepth > 0) {
      if (c === '{') { exprDepth++; content += c; }
      else if (c === '}') { exprDepth--; content += c; }
      else if (c === '`') {
        const { text, end } = processTemplateLiteral(code, i);
        content += text; i = end; continue;
      } else if (c === "'" || c === '"') {
        const end = scanPastString(code, i);
        content += code.slice(i, end); i = end; continue;
      } else { content += c; }
      i++; continue;
    }

    if (c === '$' && code[i + 1] === '{') {
      content += '${'; i += 2; exprDepth = 1; continue;
    }

    if (c === '`') {
      if (scriptDepth > 0) {
        const { fixedStr, end } = fixBadTemplate(code, i);
        content += fixedStr; i = end; continue;
      }
      return { text: '`' + content + '`', end: i + 1 };
    }

    if (c === '<') {
      const tail = code.slice(i);
      const openMatch = tail.match(/^<script(?:\s[^>]*)?\s*>/i);
      if (openMatch) {
        scriptDepth++;
        content += openMatch[0]; i += openMatch[0].length; continue;
      }
      const closeMatch = tail.match(/^<\/script\s*>/i);
      if (closeMatch) {
        scriptDepth = Math.max(0, scriptDepth - 1);
        content += closeMatch[0]; i += closeMatch[0].length; continue;
      }
    }

    content += c; i++;
  }

  return { text: '`' + content, end: i };
}

function fixBadTemplate(code, start) {
  let result = "'";
  let i = start + 1;
  let depth = 0;

  while (i < code.length) {
    const c = code[i];
    if (c === '\\') { result += c + (code[i + 1] || ''); i += 2; continue; }

    if (depth === 0) {
      if (c === '`') { result += "'"; i++; break; }
      if (c === '$' && code[i + 1] === '{') { result += "' + ("; i += 2; depth = 1; continue; }
      if (c === "'") { result += "\\'"; i++; continue; }
      if (c === '\n') { result += '\\n'; i++; continue; }
      if (c === '\r') { result += '\\r'; i++; continue; }
      result += c; i++;
    } else {
      if (c === '{') { depth++; result += c; }
      else if (c === '}') {
        depth--;
        result += depth === 0 ? ") + '" : c;
      } else if (c === '`') {
        const { fixedStr, end } = fixBadTemplate(code, i);
        result += fixedStr; i = end; continue;
      } else { result += c; }
      i++;
    }
  }

  return { fixedStr: result, end: i };
}

function fixNestedBackticks(code) {
  let result = '';
  let i = 0;

  while (i < code.length) {
    const c = code[i];
    if (c === '\\') { result += c + (code[i + 1] || ''); i += 2; continue; }
    if (c === "'" || c === '"') {
      const end = scanPastString(code, i);
      result += code.slice(i, end); i = end; continue;
    }
    if (c === '`') {
      const { text, end } = processTemplateLiteral(code, i);
      result += text; i = end; continue;
    }
    result += c; i++;
  }

  return result;
}

// ── test harness ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    console.error(`    expected: ${JSON.stringify(expected)}`);
    console.error(`    actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

// ── test cases ────────────────────────────────────────────────────────────────

console.log('\n1. No backtick issues (pass-through)');
{
  const code = "export default { fetch() { return new Response('hello'); } }";
  assert('plain code unchanged', fixNestedBackticks(code), code);
}

console.log('\n2. Single clean template literal (no script) — unchanged');
{
  const code = "const html = `<p>Hello</p>`; return html;";
  assert('clean template unchanged', fixNestedBackticks(code), code);
}

console.log('\n3. Simple bad backtick in script section');
{
  const code = "const html = `<script>const x = `value`;</script>`; return html;";
  const fixed = fixNestedBackticks(code);
  assert('backticks converted to single quotes', fixed,
    "const html = `<script>const x = 'value';</script>`; return html;");
  assert('result has exactly 2 backticks', (fixed.match(/`/g) || []).length, 2);
}

console.log('\n4. Bad backtick with ${} interpolation');
{
  const code = "const html = `<script>const g = `Hello ${name}!`;</script>`;";
  const fixed = fixNestedBackticks(code);
  assert('interpolation converted to concatenation', fixed,
    "const html = `<script>const g = 'Hello ' + (name) + '!';</script>`;");
}

console.log('\n5. Multiple bad backticks in script section');
{
  const code = "const html = `<script>const a = `foo`;\nconst b = `bar`;</script>`;";
  const fixed = fixNestedBackticks(code);
  assert('both bad templates converted', fixed,
    "const html = `<script>const a = 'foo';\nconst b = 'bar';</script>`;");
}

console.log('\n6. Outer template ${} expressions preserved');
{
  const code = "const html = `<p>${data.name}</p><script>const x = `val`;</script>`;";
  const fixed = fixNestedBackticks(code);
  // ${data.name} is in HTML text (not script) — outer template expr, preserved
  assert('outer ${} preserved, script backtick fixed', fixed,
    "const html = `<p>${data.name}</p><script>const x = 'val';</script>`;");
}

console.log('\n7. Server-side injection + bad template in same script section');
{
  const code = "const html = `<script>const items = ${JSON.stringify(d)};\nconst msg = `Hi`;</script>`;";
  const fixed = fixNestedBackticks(code);
  assert('server injection preserved, bad template fixed', fixed,
    "const html = `<script>const items = ${JSON.stringify(d)};\nconst msg = 'Hi';</script>`;");
}

console.log('\n8. Multiple VALID template literals before the HTML one');
{
  const url = 'const url = `https://api.example.com/${ep}`;';
  const html = 'const html = `<script>const x = `v`;</script>`;';
  const code = url + '\n' + html;
  const fixed = fixNestedBackticks(code);
  // URL template should be unchanged; only the HTML template's script is fixed
  assert('url template unchanged', fixed.includes('`https://api.example.com/${ep}`'), true);
  assert('html script fixed', fixed.includes("const x = 'v'"), true);
  assert('url still has its backticks', (fixed.match(/`/g) || []).length, 4);
}

console.log('\n9. Bad template with nested braces in expression');
{
  const code = "const html = `<script>const f = `${obj.map(x => x.v).join('')}`;</script>`;";
  const fixed = fixNestedBackticks(code);
  assert('nested braces in expr handled', fixed,
    "const html = `<script>const f = '' + (obj.map(x => x.v).join('')) + '';</script>`;");
}

console.log('\n10. Single-quote inside bad template gets escaped');
{
  const code = "const html = `<script>const s = `it's here`;</script>`;";
  const fixed = fixNestedBackticks(code);
  assert("single quote escaped", fixed,
    "const html = `<script>const s = 'it\\'s here';</script>`;");
}

console.log('\n11. Newline inside bad template gets escaped');
{
  const code = "const html = `<script>const s = `line1\nline2`;</script>`;";
  const fixed = fixNestedBackticks(code);
  assert('newline escaped', fixed,
    "const html = `<script>const s = 'line1\\nline2';</script>`;");
}

console.log('\n12. No backticks — code returned unchanged');
{
  const code = 'export default { fetch() { return new Response("hi"); } }';
  assert('no backticks unchanged', fixNestedBackticks(code), code);
}

// ── summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
