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

import { SYSTEM_PROMPT, buildUserPrompt, PROMPT_VERSION } from "./llm/prompt";
import { classifyComplexity, classifyQuery, callLLM, CLARIFY_PROMPT, isToolWorthy } from "./llm/router";
import { validateWorkerCode, sanitizeCode, injectBaseCSS } from "./toolkit/validate";
import { BASE_CSS, BASE_SCRIPT } from "./toolkit/base-css";
import { generateFetchGuard } from "./toolkit/outbound";

// ── Gemini Image Generation ─────────────────────────────
const DELIGHT_SIGNALS = [
  "how do i make", "how to make", "recipe", "cook", "bake",
  "explain", "what is", "how does", "tell me about",
  "history of", "guide to", "overview", "story of",
  "best exercises", "workout", "yoga",
];

function isDelightQuery(query: string): boolean {
  const lower = query.toLowerCase();
  return DELIGHT_SIGNALS.some(s => lower.includes(s));
}

function buildImagePrompt(query: string): string {
  return `Watercolor editorial illustration on a warm cream background (#f5ede0). Soft, flowing watercolor technique with visible brush strokes and gentle color bleeds. No hard outlines. Warm palette: saffron, terracotta, turmeric gold, sage green, cream. The illustration should feel like it belongs in a premium food or lifestyle magazine. White/cream margins around the edges. No text, no labels, no UI elements, no words. Subject: ${query}. Wide aspect ratio, horizontal composition.`;
}

async function generateGeminiImage(apiKey: string, query: string): Promise<string | null> {
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildImagePrompt(query) }] }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          },
        }),
      }
    );

    if (!res.ok) {
      console.warn("[Gemini Image] API error:", res.status);
      return null;
    }

    const data = await res.json() as {
      candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[];
    };

    const parts = data?.candidates?.[0]?.content?.parts;
    if (!parts) return null;

    for (const part of parts) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (err) {
    console.warn("[Gemini Image] Error:", err);
    return null; // fail open
  }
}

function injectHeroImage(html: string, imageDataUri: string): string {
  // Inject after <body> tag as a full-width hero image
  const heroHtml = `<div style="margin:-2.5rem -1.75rem 1.5rem;text-align:center"><img src="${imageDataUri}" alt="" style="width:100%;max-height:280px;object-fit:cover;border-radius:0 0 20px 20px;box-shadow:0 4px 24px rgba(0,0,0,0.08)"></div>`;
  return html.replace(/<body([^>]*)>/i, `<body$1>${heroHtml}`);
}

// ── Structured metadata extraction ─────────────────────────
interface ToolMeta {
  toolType?: string;
  title?: string;
  inputs?: string[];
  dataSources?: { name: string; url: string; live: boolean }[];
  assumptions?: string[];
  limitations?: string[];
  computedValues?: {
    primaryMetric?: { label: string; value: string; unit?: string };
    secondaryMetrics?: { label: string; value: string }[];
  };
}

function extractToolMeta(html: string): ToolMeta | null {
  const match = html.match(/<script\s+type="application\/json"\s+id="yukti-meta">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// ── Cookie helpers ─────────────────────────────────────────
function getCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get("Cookie") || "";
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

async function getUserData(env: Env, uid: string): Promise<{ tools: any[]; createdAt: string }> {
  try {
    const raw = await env.TOOLS_KV.get(`user:${uid}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { tools: [], createdAt: new Date().toISOString() };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // ── User identity via cookie ──────────────────────────────
    let uid = getCookie(request, "yukti-uid");
    const isNewUser = !uid;
    if (!uid) {
      uid = crypto.randomUUID();
    }

    function withUserCookie(response: Response): Response {
      if (isNewUser) {
        const res = new Response(response.body, response);
        res.headers.append("Set-Cookie", `yukti-uid=${uid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${86400 * 365}`);
        return res;
      }
      return response;
    }

    const response = await this.handleRequest(request, env, uid);
    return withUserCookie(response);
  },

  async handleRequest(request: Request, env: Env, uid: string): Promise<Response> {
    const url = new URL(request.url);

    // ── API: User data ────────────────────────────────────────
    if (url.pathname === "/api/me" && request.method === "GET") {
      if (!env.TOOLS_KV) return Response.json({ tools: [] });
      const userData = await getUserData(env, uid);
      return Response.json(userData);
    }

    if (url.pathname === "/api/me/tools" && request.method === "POST") {
      if (!env.TOOLS_KV) return Response.json({ ok: false, error: "KV not configured" }, { status: 500 });
      const { runId, query, toolUrl, model } = await request.json<{ runId: string; query: string; toolUrl: string; model: string }>();
      const userData = await getUserData(env, uid);
      const tool = { runId, query, toolUrl, model, savedAt: new Date().toISOString() };
      userData.tools = [tool, ...userData.tools.filter((t: any) => t.runId !== runId)].slice(0, 100);
      await env.TOOLS_KV.put(`user:${uid}`, JSON.stringify(userData), { expirationTtl: 86400 * 365 });
      return Response.json({ ok: true, tools: userData.tools });
    }

    if (url.pathname === "/api/me/tools" && request.method === "DELETE") {
      if (!env.TOOLS_KV) return Response.json({ ok: false, error: "KV not configured" }, { status: 500 });
      const { runId } = await request.json<{ runId: string }>();
      const userData = await getUserData(env, uid);
      userData.tools = userData.tools.filter((t: any) => t.runId !== runId);
      await env.TOOLS_KV.put(`user:${uid}`, JSON.stringify(userData), { expirationTtl: 86400 * 365 });
      return Response.json({ ok: true, tools: userData.tools });
    }

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

    // ── API: Stream generation with SSE ────────────────────────
    if (url.pathname === "/api/stream" && request.method === "POST") {
      const { topic } = await request.json<{ topic: string }>();
      if (!topic?.trim()) {
        return Response.json({ error: "Topic is required" }, { status: 400 });
      }
      if (!env.OPENROUTER_API_KEY) {
        return Response.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 500 });
      }

      // Scope check — reject queries that aren't suited for tool generation
      const worthiness = isToolWorthy(topic);
      if (!worthiness.worthy) {
        return Response.json({
          ok: false,
          notToolWorthy: true,
          reason: worthiness.reason,
          suggestion: worthiness.suggestion,
        });
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: object) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          try {
            const runId = generateRunId();
            const timing: Record<string, number> = {};
            const totalStart = Date.now();

            // 1. Classify
            send("stage", { stage: "classifying", detail: "Analyzing query complexity" });
            const classification = classifyQuery(topic);
            const tier = classification.tier;
            const queryType = classification.queryType;
            const userPrompt = buildUserPrompt(topic);
            const wantsImage = (queryType === "delight" || isDelightQuery(topic)) && env.GEMINI_API_KEY;

            // 2. Generate code with LLM
            send("stage", { stage: "generating", detail: "Writing Worker code with Claude" });
            const llmStart = Date.now();
            const [llmResult, heroImage] = await Promise.all([
              callLLM(env.OPENROUTER_API_KEY, tier, SYSTEM_PROMPT, userPrompt),
              wantsImage ? generateGeminiImage(env.GEMINI_API_KEY, topic) : Promise.resolve(null),
            ]);
            let code = sanitizeCode(cleanCode(llmResult.text));
            timing.llmMs = Date.now() - llmStart;
            if (heroImage) console.log(`[${runId}] Gemini image generated (${Math.round(heroImage.length / 1024)}KB)`);

            // 3. Validate
            send("stage", { stage: "validating", detail: "Checking code safety and structure" });
            let validation = validateWorkerCode(code);
            if (validation.warnings.length) {
              console.warn(`[${runId}] Validation warnings:`, validation.warnings);
            }
            if (!validation.valid) {
              send("error", { error: `Code validation failed: ${validation.error}` });
              controller.close();
              return;
            }

            // 4. Execute in Dynamic Worker
            send("stage", { stage: "executing", detail: "Running in isolated V8 sandbox" });
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

              // 4b. Retry
              send("stage", { stage: "retrying", detail: "First attempt failed, regenerating" });
              const retryPrompt = `${userPrompt}\n\nYour previous code failed with: ${errMsg}\n\nCommon causes:\n- Using backticks/template literals inside the HTML string (use '+' concatenation instead)\n- Using ES6 classes inside <script> (use plain functions)\n- Syntax errors in nested strings\n- Accessing properties on null API responses (e.g., data.meals[0] when data.meals is null). ALWAYS check: if (data && data.meals && data.meals.length > 0) before accessing.\n- Not handling API fetch failures — ALWAYS wrap fetch in try/catch with a hardcoded fallback.\n\nFix the error and return the corrected module.`;

              const retryStart = Date.now();
              const retryResult = await callLLM(env.OPENROUTER_API_KEY, tier, SYSTEM_PROMPT, retryPrompt);
              code = sanitizeCode(cleanCode(retryResult.text));
              timing.retryLlmMs = Date.now() - retryStart;

              validation = validateWorkerCode(code);
              if (!validation.valid) {
                send("error", { error: `Retry failed validation: ${validation.error}` });
                controller.close();
                return;
              }

              send("stage", { stage: "executing", detail: "Running retry in V8 sandbox" });
              try {
                const retryResult2 = await executeInWorker(env, code, topic);
                html = retryResult2.html;
                granted = retryResult2.granted;
              } catch (retryError) {
                send("error", { error: `Worker execution failed after retry: ${retryError instanceof Error ? retryError.message : String(retryError)}` });
                controller.close();
                return;
              }
            }
            timing.execMs = Date.now() - execStart;

            // 5. Inject base CSS + hero image
            html = injectBaseCSS(html, BASE_CSS, BASE_SCRIPT);
            if (heroImage) {
              html = injectHeroImage(html, heroImage);
            }
            timing.totalMs = Date.now() - totalStart;

            // 6. Save to KV for sharing
            let toolUrl: string | null = null;
            if (env.TOOLS_KV) {
              try {
                await env.TOOLS_KV.put(`tool:${runId}`, html, {
                  expirationTtl: 86400 * 90,
                  metadata: { topic, model: llmResult.model, uid, createdAt: new Date().toISOString() },
                });
                toolUrl = `/tool/${runId}`;
              } catch (kvErr) {
                console.warn(`[${runId}] KV save failed:`, kvErr);
              }
            }

            // Extract structured metadata
            const toolMeta = extractToolMeta(html);
            if (!toolMeta) {
              console.warn(`[${runId}] No yukti-meta block found in output`);
            }

            // Static analysis: extract domains the generated code will fetch
            const domainsFetched = extractFetchDomains(code);

            await trackEvent(env, "generate", {
              topic, runId, tier, model: llmResult.model, retried,
              totalMs: timing.totalMs, queryType, granted,
              warnings: validation.warnings,
              success: true,
              toolMeta: toolMeta || null,
              domainsFetched,
            });

            send("complete", {
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
                queryType,
                promptVersion: PROMPT_VERSION,
                domainsFetched,
                validationWarnings: validation.warnings,
                runId,
                toolMeta: toolMeta || null,
              },
            });
          } catch (err) {
            console.error("YUKTI STREAM ERROR:", err);
            await trackEvent(env, "failure", { topic, error: String(err) });
            send("error", { error: err instanceof Error ? err.message : String(err) });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
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

        // Scope check — reject queries that aren't suited for tool generation
        const worthiness = isToolWorthy(topic);
        if (!worthiness.worthy) {
          return Response.json({
            ok: false,
            notToolWorthy: true,
            reason: worthiness.reason,
            suggestion: worthiness.suggestion,
          });
        }

        const runId = generateRunId();
        const timing: Record<string, number> = {};
        const totalStart = Date.now();

        // 1. Classify + generate code (+ image in parallel for delight queries)
        const classification = classifyQuery(topic);
        const tier = classification.tier;
        const queryType = classification.queryType;
        const userPrompt = buildUserPrompt(topic);
        const wantsImage = (queryType === "delight" || isDelightQuery(topic)) && env.GEMINI_API_KEY;

        const llmStart = Date.now();
        // Fire LLM and image generation in parallel
        const [llmResult, heroImage] = await Promise.all([
          callLLM(env.OPENROUTER_API_KEY, tier, SYSTEM_PROMPT, userPrompt),
          wantsImage ? generateGeminiImage(env.GEMINI_API_KEY, topic) : Promise.resolve(null),
        ]);
        let code = sanitizeCode(cleanCode(llmResult.text));
        timing.llmMs = Date.now() - llmStart;
        if (heroImage) console.log(`[${runId}] Gemini image generated (${Math.round(heroImage.length / 1024)}KB)`);

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
          const retryPrompt = `${userPrompt}\n\nYour previous code failed with: ${errMsg}\n\nCommon causes:\n- Using backticks/template literals inside the HTML string (use '+' concatenation instead)\n- Using ES6 classes inside <script> (use plain functions)\n- Syntax errors in nested strings\n- Accessing properties on null API responses (e.g., data.meals[0] when data.meals is null). ALWAYS check: if (data && data.meals && data.meals.length > 0) before accessing.\n- Not handling API fetch failures — ALWAYS wrap fetch in try/catch with a hardcoded fallback.\n\nFix the error and return the corrected module.`;

          const retryStart = Date.now();
          const retryResult = await callLLM(env.OPENROUTER_API_KEY, tier, SYSTEM_PROMPT, retryPrompt);
          code = sanitizeCode(cleanCode(retryResult.text));
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

        // 4. Inject base CSS + hero image
        html = injectBaseCSS(html, BASE_CSS, BASE_SCRIPT);
        if (heroImage) {
          html = injectHeroImage(html, heroImage);
        }
        timing.totalMs = Date.now() - totalStart;

        // 5. Save to KV for sharing
        let toolUrl: string | null = null;
        if (env.TOOLS_KV) {
          try {
            await env.TOOLS_KV.put(`tool:${runId}`, html, {
              expirationTtl: 86400 * 90, // 90 days
              metadata: { topic, model: llmResult.model, uid, createdAt: new Date().toISOString() },
            });
            toolUrl = `/tool/${runId}`;
          } catch (kvErr) {
            console.warn(`[${runId}] KV save failed:`, kvErr);
          }
        }

        // Static analysis: extract domains the generated code will fetch
        const domainsFetched = extractFetchDomains(code);

        // Extract structured metadata
        const toolMeta = extractToolMeta(html);
        if (!toolMeta) {
          console.warn(`[${runId}] No yukti-meta block found in output`);
        }

        await trackEvent(env, "generate", {
          topic, runId, tier, model: llmResult.model, retried,
          totalMs: timing.totalMs, queryType, granted,
          warnings: validation.warnings,
          success: true,
          domainsFetched,
          toolMeta: toolMeta || null,
        });

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
            queryType,
            promptVersion: PROMPT_VERSION,
            domainsFetched,
            validationWarnings: validation.warnings,
            runId,
            toolMeta: toolMeta || null,
          },
        });
      } catch (err) {
        console.error("YUKTI ERROR:", err);
        await trackEvent(env, "failure", { topic: "unknown", error: String(err) });
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
        let code = sanitizeCode(cleanCode(llmResult.text));
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

        html = injectBaseCSS(html, BASE_CSS, BASE_SCRIPT);
        const totalMs = Date.now() - totalStart;

        // Save refined version
        let toolUrl: string | null = null;
        if (env.TOOLS_KV) {
          try {
            await env.TOOLS_KV.put(`tool:${runId}`, html, {
              expirationTtl: 86400 * 90,
              metadata: { topic, instruction, model: llmResult.model, uid, createdAt: new Date().toISOString() },
            });
            toolUrl = `/tool/${runId}`;
          } catch {}
        }

        await trackEvent(env, "refine", { topic, instruction, runId });

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
          const { value: html, metadata } = await env.TOOLS_KV.getWithMetadata<{ topic?: string }>("tool:" + runId);
          if (html) {
            const topic = metadata?.topic || "Interactive Tool";
            const ogTags = `<meta property="og:title" content="Yukti — ${topic.replace(/"/g, '&quot;')}">\n<meta property="og:description" content="Interactive tool built on the fly by Yukti">\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="Yukti">\n<meta name="twitter:card" content="summary">\n<meta name="twitter:title" content="Yukti — ${topic.replace(/"/g, '&quot;')}">`;
            const footer = `<div style="text-align:center;padding:1.5rem 1rem 1rem;margin-top:2rem;border-top:1px solid rgba(191,176,154,0.2);font-family:'Outfit',system-ui,sans-serif;font-size:0.6875rem;color:#96897a;">Built with <a href="/" style="color:#c2652a;text-decoration:none;font-weight:600;">Yukti</a> — interactive tools, built on the fly</div>`;
            let enriched = html.replace(/<\/head>/i, ogTags + "\n</head>");
            enriched = enriched.replace(/<\/body>/i, footer + "\n</body>");
            return new Response(enriched, {
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
        html = injectBaseCSS(html, BASE_CSS, BASE_SCRIPT);
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
        const html = injectBaseCSS(rawHtml, BASE_CSS, BASE_SCRIPT);
        const execMs = Date.now() - start;

        // Save refreshed version
        let toolUrl: string | null = null;
        if (env.TOOLS_KV) {
          try {
            await env.TOOLS_KV.put(`tool:${runId}`, html, {
              expirationTtl: 86400 * 90,
              metadata: { topic, refreshed: true, uid, createdAt: new Date().toISOString() },
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

    // ── API: Run metadata lookup ────────────────────────────────
    if (url.pathname.startsWith("/api/run/") && request.method === "GET") {
      const lookupRunId = url.pathname.slice("/api/run/".length);
      if (!lookupRunId) return Response.json({ error: "runId required" }, { status: 400 });
      if (!env.TOOLS_KV) return Response.json({ error: "KV not configured" }, { status: 500 });
      try {
        const raw = await env.TOOLS_KV.get(`run:${lookupRunId}`);
        if (!raw) return Response.json({ error: "Run not found or expired" }, { status: 404 });
        return Response.json({ runId: lookupRunId, ...JSON.parse(raw) });
      } catch {
        return Response.json({ error: "Failed to read run data" }, { status: 500 });
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

/**
 * Static analysis: extract domains from fetch() calls in generated code.
 * This gives us immediate observability without waiting for Tail Worker deployment.
 * Matches fetch('https://domain/...') patterns in the LLM-generated code.
 */
function extractFetchDomains(code: string): string[] {
  const domains: string[] = [];
  const fetchRegex = /fetch\s*\(\s*['"`]https?:\/\/([^'"`/\s?#]+)/g;
  let match;
  while ((match = fetchRegex.exec(code)) !== null) {
    const domain = match[1].toLowerCase();
    if (!domains.includes(domain)) domains.push(domain);
  }
  // Also match URL construction patterns: new URL('https://domain/...')
  const urlRegex = /new\s+URL\s*\(\s*['"`]https?:\/\/([^'"`/\s?#]+)/g;
  while ((match = urlRegex.exec(code)) !== null) {
    const domain = match[1].toLowerCase();
    if (!domains.includes(domain)) domains.push(domain);
  }
  return domains;
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
  // the LLM used template literals inside the HTML string's <script> sections.
  // The parser targets only those sections, leaving outer ${...} expressions intact.
  const backtickCount = (code.match(/`/g) || []).length;
  if (backtickCount > 2) {
    console.warn(`[cleanCode] Found ${backtickCount} backticks — attempting fix`);
    code = fixNestedBackticks(code);
  }

  return code;
}

function fixNestedBackticks(code: string): string {
  // Scan code character-by-character, properly handling strings and template
  // literals. For each template literal that contains <script> sections, fix
  // any bad nested backticks within those sections by converting them to
  // single-quoted strings. Legitimate ${...} expressions in the outer template
  // are preserved unchanged.
  let result = '';
  let i = 0;

  while (i < code.length) {
    const c = code[i];

    if (c === '\\') {
      result += c + (code[i + 1] || '');
      i += 2;
      continue;
    }

    if (c === "'" || c === '"') {
      const end = scanPastString(code, i);
      result += code.slice(i, end);
      i = end;
      continue;
    }

    if (c === '`') {
      const { text, end } = processTemplateLiteral(code, i);
      result += text;
      i = end;
      continue;
    }

    result += c;
    i++;
  }

  return result;
}

function scanPastString(code: string, start: number): number {
  const q = code[start];
  let i = start + 1;
  while (i < code.length) {
    if (code[i] === '\\') { i += 2; continue; }
    if (code[i] === q) { i++; break; }
    i++;
  }
  return i;
}

function processTemplateLiteral(code: string, start: number): { text: string; end: number } {
  // Parse a template literal starting at start (code[start] === '`').
  // Track <script> depth to detect bad nested backticks inside script sections.
  // Bad backticks are converted to single-quoted strings via fixBadTemplate.
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
      // Inside ${...}: track braces and handle nested strings/templates
      if (c === '{') {
        exprDepth++;
        content += c;
      } else if (c === '}') {
        exprDepth--;
        content += c;
      } else if (c === '`') {
        const { text, end } = processTemplateLiteral(code, i);
        content += text;
        i = end;
        continue;
      } else if (c === "'" || c === '"') {
        const end = scanPastString(code, i);
        content += code.slice(i, end);
        i = end;
        continue;
      } else {
        content += c;
      }
      i++;
      continue;
    }

    // Template text (exprDepth === 0)
    if (c === '$' && code[i + 1] === '{') {
      content += '${';
      i += 2;
      exprDepth = 1;
      continue;
    }

    if (c === '`') {
      if (scriptDepth > 0) {
        // Bad nested backtick inside a <script> section — convert to single-quoted string
        const { fixedStr, end } = fixBadTemplate(code, i);
        content += fixedStr;
        i = end;
        continue;
      }
      // Real closing backtick of this template literal
      return { text: '`' + content + '`', end: i + 1 };
    }

    // Track <script> / </script> sections so we know when we're in browser JS
    if (c === '<') {
      const tail = code.slice(i);
      const openMatch = tail.match(/^<script(?:\s[^>]*)?\s*>/i);
      if (openMatch) {
        scriptDepth++;
        content += openMatch[0];
        i += openMatch[0].length;
        continue;
      }
      const closeMatch = tail.match(/^<\/script\s*>/i);
      if (closeMatch) {
        scriptDepth = Math.max(0, scriptDepth - 1);
        content += closeMatch[0];
        i += closeMatch[0].length;
        continue;
      }
    }

    content += c;
    i++;
  }

  // Unclosed template literal — return as-is
  return { text: '`' + content, end: i };
}

function fixBadTemplate(code: string, start: number): { fixedStr: string; end: number } {
  // code[start] is the opening backtick of a bad nested template literal.
  // Converts it to a single-quoted string: '...' + (expr) + '...'
  let result = "'";
  let i = start + 1;
  let depth = 0;

  while (i < code.length) {
    const c = code[i];

    if (c === '\\') {
      result += c + (code[i + 1] || '');
      i += 2;
      continue;
    }

    if (depth === 0) {
      if (c === '`') { result += "'"; i++; break; }
      if (c === '$' && code[i + 1] === '{') { result += "' + ("; i += 2; depth = 1; continue; }
      if (c === "'") { result += "\\'"; i++; continue; }
      if (c === '\n') { result += '\\n'; i++; continue; }
      if (c === '\r') { result += '\\r'; i++; continue; }
      result += c; i++;
    } else {
      // Inside ${...}: track brace depth
      if (c === '{') { depth++; result += c; }
      else if (c === '}') {
        depth--;
        result += depth === 0 ? ") + '" : c;
      } else if (c === '`') {
        // Nested template inside expression — recurse
        const { fixedStr, end } = fixBadTemplate(code, i);
        result += fixedStr;
        i = end;
        continue;
      } else { result += c; }
      i++;
    }
  }

  return { fixedStr: result, end: i };
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

    // Store individual run record with 30-day TTL
    if (data.runId) {
      const runRecord = {
        type,
        topic: data.topic,
        model: data.model,
        tier: data.tier,
        queryType: data.queryType,
        timing: data.totalMs ? { totalMs: data.totalMs } : undefined,
        granted: data.granted,
        warnings: data.warnings,
        retried: data.retried,
        success: data.success ?? (type !== "failure"),
        createdAt: new Date().toISOString(),
      };
      await env.TOOLS_KV.put(`run:${data.runId}`, JSON.stringify(runRecord), {
        expirationTtl: 86400 * 30, // 30 days
      });
    }

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
