/**
 * Host Worker — orchestrates LLM code generation + Dynamic Worker execution.
 *
 * Flow:
 * 1. User sends a topic
 * 2. LLM generates a Cloudflare Worker module
 * 3. We validate the code structure
 * 4. LOADER.load() runs it in a V8 sandbox with filtered outbound
 * 5. Dynamic Worker fetches live data + returns interactive HTML
 * 6. Host injects base CSS, saves to KV, returns HTML + metadata
 * 7. If anything fails, retry once with error context
 */

import { SYSTEM_PROMPT, buildUserPrompt } from "./llm/prompt";
import { classifyComplexity, callLLM, CLARIFY_PROMPT } from "./llm/router";
import { validateWorkerCode, injectBaseCSS } from "./toolkit/validate";
import { BASE_CSS } from "./toolkit/base-css";
import { generateFetchGuard } from "./toolkit/outbound";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ── API: Check if query needs clarification ────────────
    if (url.pathname === "/api/clarify" && request.method === "POST") {
      try {
        const { topic } = await request.json<{ topic: string }>();
        if (!topic?.trim()) {
          return Response.json({ action: "build" });
        }
        if (!env.OPENROUTER_API_KEY) {
          return Response.json({ action: "build" }); // fail open
        }

        const result = await callLLM(env.OPENROUTER_API_KEY, "fast", CLARIFY_PROMPT, topic);
        let parsed: { action: string; questions?: unknown[] };
        try {
          // Strip markdown fences if present
          const cleaned = result.text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          parsed = JSON.parse(cleaned);
        } catch {
          return Response.json({ action: "build" }); // fail open
        }

        return Response.json(parsed);
      } catch {
        return Response.json({ action: "build" }); // fail open — don't block generation
      }
    }

    // ── API: Generate a tool ─────────────────────────────────
    if (url.pathname === "/api/explain" && request.method === "POST") {
      try {
        const { topic } = await request.json<{ topic: string }>();
        if (!topic?.trim()) {
          return Response.json({ error: "Topic is required" }, { status: 400 });
        }
        if (!env.OPENROUTER_API_KEY) {
          return Response.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
        }

        const runId = generateRunId();
        const timing: Record<string, number> = {};
        const totalStart = Date.now();

        // 1. Classify + generate code
        const tier = classifyComplexity(topic);
        const userPrompt = buildUserPrompt(topic);

        const llmStart = Date.now();
        let llmResult = await callLLM(env.OPENROUTER_API_KEY, tier, SYSTEM_PROMPT, userPrompt);
        let code = cleanCode(llmResult.text);
        timing.llmMs = Date.now() - llmStart;

        // 2. Validate
        let validation = validateWorkerCode(code);
        if (validation.warnings.length) {
          console.warn(`[${runId}] Validation warnings:`, validation.warnings);
        }
        if (!validation.valid) {
          return Response.json({
            error: `Code validation failed: ${validation.error}`,
            runId,
          }, { status: 502 });
        }

        // 3. Execute in Dynamic Worker
        let html: string;
        let granted: string[] = [];
        let retried = false;
        const execStart = Date.now();
        try {
          const result = await executeInWorker(env, code, topic);
          html = result.html;
          granted = result.granted;
        } catch (loadError) {
          retried = true;
          console.log(`[${runId}] First attempt failed, retrying:`, loadError);
          const errMsg = loadError instanceof Error ? loadError.message : String(loadError);
          const retryPrompt = `${userPrompt}\n\nYour previous code failed with: ${errMsg}\n\nCommon causes:\n- Using backticks/template literals inside the HTML string (use '+' concatenation instead)\n- Using ES6 classes inside <script> (use plain functions)\n- Syntax errors in nested strings\n\nFix the error and return the corrected module.`;

          const retryStart = Date.now();
          const retryResult = await callLLM(env.OPENROUTER_API_KEY, tier, SYSTEM_PROMPT, retryPrompt);
          code = cleanCode(retryResult.text);
          timing.retryLlmMs = Date.now() - retryStart;

          validation = validateWorkerCode(code);
          if (!validation.valid) {
            return Response.json({ error: `Retry failed validation: ${validation.error}`, runId }, { status: 502 });
          }

          try {
            const retryResult2 = await executeInWorker(env, code, topic);
            html = retryResult2.html;
            granted = retryResult2.granted;
          } catch (retryError) {
            return Response.json({
              error: `Worker execution failed after retry: ${retryError instanceof Error ? retryError.message : String(retryError)}`,
              runId,
            }, { status: 502 });
          }
        }
        timing.execMs = Date.now() - execStart;

        // 4. Inject base CSS
        html = injectBaseCSS(html, BASE_CSS);
        timing.totalMs = Date.now() - totalStart;

        // 5. Save to KV for sharing
        let toolUrl: string | null = null;
        if (env.TOOLS_KV) {
          try {
            await env.TOOLS_KV.put(`tool:${runId}`, html, {
              expirationTtl: 86400 * 7, // 7 days
              metadata: { topic, model: llmResult.model, createdAt: new Date().toISOString() },
            });
            toolUrl = `/tool/${runId}`;
          } catch (kvErr) {
            console.warn(`[${runId}] KV save failed:`, kvErr);
          }
        }

        trackEvent(env, "generate", { topic, runId, tier, model: llmResult.model, retried, totalMs: timing.totalMs });

        return Response.json({
          ok: true,
          html,
          code,
          runId,
          toolUrl,
          meta: {
            tier,
            model: llmResult.model,
            provider: llmResult.provider,
            retried,
            timing,
            granted,
          },
        });
      } catch (err) {
        console.error("YUKTI ERROR:", err);
        trackEvent(env, "failure", { topic: "unknown", error: String(err) });
        return Response.json({
          error: err instanceof Error ? err.message : String(err),
        }, { status: 500 });
      }
    }

    // ── API: Refine an existing tool ──────────────────────────
    if (url.pathname === "/api/refine" && request.method === "POST") {
      try {
        const { code: originalCode, instruction, topic } = await request.json<{
          code: string; instruction: string; topic: string;
        }>();

        if (!originalCode || !instruction) {
          return Response.json({ error: "code and instruction are required" }, { status: 400 });
        }

        const runId = generateRunId();
        const totalStart = Date.now();

        const refinePrompt = `Here is a Cloudflare Worker module that generates an interactive tool for: "${topic}"

\`\`\`javascript
${originalCode}
\`\`\`

The user wants this modification: "${instruction}"

Return the COMPLETE modified Worker module with the change applied. Return ONLY the JavaScript module — no explanation, no markdown fences. Keep everything that works, only change what the user asked for.`;

        const llmStart = Date.now();
        const llmResult = await callLLM(env.OPENROUTER_API_KEY, "standard", SYSTEM_PROMPT, refinePrompt);
        let code = cleanCode(llmResult.text);
        const llmTime = Date.now() - llmStart;

        const validation = validateWorkerCode(code);
        if (!validation.valid) {
          return Response.json({ error: `Refined code invalid: ${validation.error}`, runId }, { status: 502 });
        }

        let html: string;
        try {
          const execResult = await executeInWorker(env, code, topic);
          html = execResult.html;
        } catch (execErr) {
          return Response.json({
            error: `Refined worker failed: ${execErr instanceof Error ? execErr.message : String(execErr)}`,
            runId,
          }, { status: 502 });
        }

        html = injectBaseCSS(html, BASE_CSS);
        const totalMs = Date.now() - totalStart;

        // Save refined version
        let toolUrl: string | null = null;
        if (env.TOOLS_KV) {
          try {
            await env.TOOLS_KV.put(`tool:${runId}`, html, {
              expirationTtl: 86400 * 7,
              metadata: { topic, instruction, model: llmResult.model, createdAt: new Date().toISOString() },
            });
            toolUrl = `/tool/${runId}`;
          } catch {}
        }

        trackEvent(env, "refine", { topic, instruction, runId });

        return Response.json({
          ok: true,
          html,
          code,
          runId,
          toolUrl,
          meta: {
            model: llmResult.model,
            provider: llmResult.provider,
            timing: { llmMs: llmTime, totalMs },
          },
        });
      } catch (err) {
        return Response.json({
          error: err instanceof Error ? err.message : String(err),
        }, { status: 500 });
      }
    }

    // ── Serve saved tool ─────────────────────────────────────
    if (url.pathname.startsWith("/tool/")) {
      const runId = url.pathname.slice(6); // strip "/tool/"
      if (!runId) return new Response("Not found", { status: 404 });

      if (env.TOOLS_KV) {
        try {
          const html = await env.TOOLS_KV.get(`tool:${runId}`);
          if (html) {
            return new Response(html, {
              headers: { "Content-Type": "text/html; charset=utf-8" },
            });
          }
        } catch {}
      }
      return new Response("Tool not found or expired", { status: 404 });
    }

    // ── Static test page ─────────────────────────────────────
    if (url.pathname === "/api/test") {
      const testCode = `
export default {
  fetch() {
    const html = \`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Income Tax Calculator</title></head>
<body>
<h1>Income Tax Calculator</h1>
<p class="subtitle">FY 2025-26 — Drag the slider to see your tax</p>
<div class="section">
  <div class="control">
    <label>Annual Income <span class="val" id="inc-v">₹12,00,000</span></label>
    <input type="range" id="inc" min="300000" max="10000000" step="50000" value="1200000" oninput="calc()">
  </div>
</div>
<div class="tab-bar">
  <div class="tab active" onclick="sw('new')">New Regime</div>
  <div class="tab" onclick="sw('old')">Old Regime</div>
</div>
<div id="out"></div>
<script>
let reg='new';
const ns=[[0,400000,0],[400000,800000,.05],[800000,1200000,.1],[1200000,1600000,.15],[1600000,2000000,.2],[2000000,2400000,.25],[2400000,Infinity,.3]];
const os=[[0,250000,0],[250000,500000,.05],[500000,1000000,.2],[1000000,Infinity,.3]];
function sw(t){reg=t;document.querySelectorAll('.tab').forEach(e=>e.classList.toggle('active',e.textContent.toLowerCase().includes(t)));calc()}
function f(n){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n)}
function taxFor(inc,sl){let t=0;for(const[lo,hi,r]of sl){if(inc<=lo)break;t+=(Math.min(inc,hi)-lo)*r}return t}
function calc(){
  const inc=+document.getElementById('inc').value;
  document.getElementById('inc-v').textContent=f(inc);
  const sl=reg==='new'?ns:os;
  const ti=Math.max(0,inc-75000);
  const tax=taxFor(ti,sl);
  const cess=tax*.04;
  const total=tax+cess;
  const eff=inc>0?(total/inc*100).toFixed(1):'0.0';
  let tb='<table><tr><th>Slab</th><th>Rate</th><th>Tax</th></tr>';
  for(const[lo,hi,r]of sl){if(ti<=lo)break;const a=(Math.min(ti,hi)-lo)*r;const h=hi===Infinity?'Above '+f(lo):f(lo)+' – '+f(hi);tb+='<tr><td>'+h+'</td><td>'+(r*100)+'%</td><td>'+f(a)+'</td></tr>'}
  tb+='</table>';
  document.getElementById('out').innerHTML='<div class="grid-3" style="margin-bottom:1.25rem"><div class="output highlight"><div class="label">Total Tax</div><div class="value">'+f(total)+'</div></div><div class="output"><div class="label">Monthly</div><div class="value">'+f(total/12)+'</div></div><div class="output"><div class="label">Effective Rate</div><div class="value">'+eff+'%</div></div></div><h3>Slab Breakdown</h3>'+tb+'<p style="margin-top:1rem">Standard deduction of '+f(75000)+' applied. 4% cess included.</p>';
}
calc();
</script>
</body></html>\`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}`;

      try {
        let { html } = await executeInWorker(env, testCode, "tax calculator test");
        html = injectBaseCSS(html, BASE_CSS);
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      } catch (err) {
        return Response.json({ error: String(err) }, { status: 500 });
      }
    }

    // ── API: Rerun existing code (live refresh) ────────────────
    if (url.pathname === "/api/rerun" && request.method === "POST") {
      try {
        const { code, topic } = await request.json<{ code: string; topic: string }>();
        if (!code) {
          return Response.json({ error: "code is required" }, { status: 400 });
        }

        const runId = generateRunId();
        const start = Date.now();
        const { html: rawHtml, granted } = await executeInWorker(env, code, topic);
        const html = injectBaseCSS(rawHtml, BASE_CSS);
        const execMs = Date.now() - start;

        // Save refreshed version
        let toolUrl: string | null = null;
        if (env.TOOLS_KV) {
          try {
            await env.TOOLS_KV.put(`tool:${runId}`, html, {
              expirationTtl: 86400 * 7,
              metadata: { topic, refreshed: true, createdAt: new Date().toISOString() },
            });
            toolUrl = `/tool/${runId}`;
          } catch {}
        }

        return Response.json({
          ok: true,
          html,
          code,
          runId,
          toolUrl,
          meta: { timing: { execMs }, granted },
        });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
      }
    }

    // ── API: Analytics stats ───────────────────────────────────
    if (url.pathname === "/api/stats") {
      if (!env.TOOLS_KV) return Response.json({ error: "KV not configured" });
      try {
        const [totalGenerations, totalRefines, totalFailures, recentQueries] = await Promise.all([
          env.TOOLS_KV.get("stats:generations").then(v => parseInt(v || "0")),
          env.TOOLS_KV.get("stats:refines").then(v => parseInt(v || "0")),
          env.TOOLS_KV.get("stats:failures").then(v => parseInt(v || "0")),
          env.TOOLS_KV.get("stats:recent").then(v => {
            try { return JSON.parse(v || "[]"); } catch { return []; }
          }),
        ]);
        return Response.json({
          totalGenerations,
          totalRefines,
          totalFailures,
          successRate: totalGenerations > 0
            ? ((totalGenerations - totalFailures) / totalGenerations * 100).toFixed(1) + "%"
            : "N/A",
          recentQueries,
        });
      } catch {
        return Response.json({ error: "Failed to read stats" });
      }
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Classify which capabilities a query needs.
 * Only grants the sandbox bindings relevant to the query.
 */
function selectCapabilities(topic: string, hostEnv: Env): { env: Record<string, string>; granted: string[] } {
  const lower = topic.toLowerCase();
  const env: Record<string, string> = {};
  const granted: string[] = [];

  // Google APIs — entities, YouTube
  if (/youtube|video|watch|channel|who is|what is|company|person|entity/i.test(lower)) {
    env.GOOGLE_API_KEY = hostEnv.GOOGLE_API_KEY || "";
    granted.push("google-knowledge", "youtube");
  }

  // India commodity prices
  if (/onion|tomato|potato|vegetable|grain|wheat|rice price|dal price|mandi|commodity/i.test(lower)) {
    env.DATA_GOV_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b";
    granted.push("india-commodity-prices");
  }

  // Nutrition
  if (/calori|protein|nutrition|diet|food|healthy|vitamin|carb|fat content/i.test(lower)) {
    env.USDA_KEY = "DEMO_KEY";
    granted.push("usda-nutrition");
  }

  // Finance — stocks, currency, crypto, mutual funds (no keys needed, but mark as granted)
  if (/stock|share|nifty|sensex|reliance|tcs|infy|crypto|bitcoin|ethereum|currency|exchange rate|convert.*to|mutual fund|nav|sip|invest/i.test(lower)) {
    granted.push("finance-apis");
  }

  // Weather / environment
  if (/weather|temperature|rain|forecast|aqi|air quality|pollution|humid/i.test(lower)) {
    granted.push("weather-apis");
  }

  // India utilities
  if (/pin ?code|ifsc|post office|bank branch/i.test(lower)) {
    granted.push("india-utilities");
  }

  // If nothing matched, grant general access (no keys, just public APIs)
  if (granted.length === 0) {
    granted.push("general");
  }

  return { env, granted };
}

async function executeInWorker(env: Env, code: string, topic?: string): Promise<{ html: string; granted: string[] }> {
  const guardedCode = generateFetchGuard() + "\n" + code;
  const capabilities = selectCapabilities(topic || "", env);

  const worker = env.LOADER.load({
    compatibilityDate: "2026-03-01",
    mainModule: "app.js",
    modules: { "app.js": guardedCode },
    globalOutbound: undefined,
    env: capabilities.env,
  });

  const result = await worker.getEntrypoint().fetch(new Request("https://worker/"));

  if (!result.ok) {
    const body = await result.text();
    throw new Error(`Worker returned ${result.status}: ${body.slice(0, 200)}`);
  }

  return { html: await result.text(), granted: capabilities.granted };
}

function cleanCode(raw: string): string {
  let code = raw
    .replace(/^```(?:javascript|js|typescript|ts)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  if (!code.startsWith("export")) {
    const idx = code.indexOf("export default");
    if (idx > -1) {
      code = code.slice(idx);
    }
  }

  // Fix nested backtick issue: if there are more than 2 backticks,
  // the LLM used template literals inside the HTML string.
  // Convert the code to use a different approach: replace the outer
  // template literal with string concatenation.
  const backtickCount = (code.match(/`/g) || []).length;
  if (backtickCount > 2) {
    console.warn(`[cleanCode] Found ${backtickCount} backticks — attempting fix`);
    // Strategy: find the HTML template literal and convert inner backticks
    // to escaped backticks or single quotes
    code = fixNestedBackticks(code);
  }

  return code;
}

function fixNestedBackticks(code: string): string {
  // Find the main template literal: const html = `...`;
  // Everything between the first ` after "= " and the matching closing `
  // is the HTML string. Any backticks inside <script> tags within it are errors.

  const firstBacktick = code.indexOf('`');
  if (firstBacktick === -1) return code;

  const lastBacktick = code.lastIndexOf('`');
  if (lastBacktick === firstBacktick) return code;

  // Extract the content between the outer backticks
  const before = code.slice(0, firstBacktick);
  const inner = code.slice(firstBacktick + 1, lastBacktick);
  const after = code.slice(lastBacktick + 1);

  // Replace any remaining backticks in the inner content with single quotes
  // and ${...} template expressions with string concatenation
  let fixed = inner
    .replace(/`/g, "'")
    .replace(/\$\{([^}]+)\}/g, "' + ($1) + '");

  return before + '`' + fixed + '`' + after;
}

function generateRunId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

async function trackEvent(
  env: Env,
  type: "generate" | "refine" | "failure",
  data: Record<string, unknown>
) {
  if (!env.TOOLS_KV) return;
  try {
    // Increment counter
    const counterKey = type === "failure" ? "stats:failures" : type === "refine" ? "stats:refines" : "stats:generations";
    const current = parseInt(await env.TOOLS_KV.get(counterKey) || "0");
    await env.TOOLS_KV.put(counterKey, String(current + 1));

    // Append to recent queries (keep last 50)
    if (type === "generate" && data.topic) {
      const recentRaw = await env.TOOLS_KV.get("stats:recent");
      let recent: unknown[] = [];
      try { recent = JSON.parse(recentRaw || "[]"); } catch {}
      recent.unshift({
        topic: data.topic,
        runId: data.runId,
        model: data.model,
        totalMs: data.totalMs,
        retried: data.retried,
        at: new Date().toISOString(),
      });
      if (recent.length > 50) recent.length = 50;
      await env.TOOLS_KV.put("stats:recent", JSON.stringify(recent));
    }
  } catch (e) {
    console.warn("Analytics tracking failed:", e);
  }
}
