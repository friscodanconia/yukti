import "./styles.css";
import { useState, useCallback, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";

const EXAMPLE_CATEGORIES = [
  {
    label: "Money",
    color: "#C2410C",
    bg: "#FFF7ED",
    border: "#FDBA74",
    queries: [
      "I earn 12L, how much tax do I pay?",
      "$500/month invested for 20 years — what do I get?",
      "Should I prepay my home loan or invest in SIPs?",
    ],
  },
  {
    label: "Decisions",
    color: "#1D4ED8",
    bg: "#EFF6FF",
    border: "#93C5FD",
    queries: [
      "Is it worth buying an EV?",
      "Rent vs buy a flat in Bangalore",
      "MBA vs job — what pays more over 10 years?",
    ],
  },
  {
    label: "Health & Food",
    color: "#15803D",
    bg: "#F0FDF4",
    border: "#86EFAC",
    queries: [
      "How much protein do I need daily?",
      "How do I make butter chicken?",
      "Best exercises for lower back pain",
    ],
  },
  {
    label: "Live Data",
    color: "#7E22CE",
    bg: "#FAF5FF",
    border: "#C4B5FD",
    queries: [
      "Any earthquakes in the last 24 hours?",
      "How did Apple stock do this month?",
      "Show me today's NASA space photo",
    ],
  },
];

// ─── Saved Tools (localStorage) ──────────────────────────────

interface SavedTool {
  runId: string;
  query: string;
  toolUrl: string;
  model: string;
  savedAt: string;
}

function getSavedTools(): SavedTool[] {
  try {
    return JSON.parse(localStorage.getItem("yukti-tools") || "[]");
  } catch { return []; }
}

function saveTool(tool: SavedTool) {
  const tools = getSavedTools().filter(t => t.runId !== tool.runId);
  tools.unshift(tool); // newest first
  if (tools.length > 50) tools.length = 50; // cap at 50
  localStorage.setItem("yukti-tools", JSON.stringify(tools));
}

function removeTool(runId: string) {
  const tools = getSavedTools().filter(t => t.runId !== runId);
  localStorage.setItem("yukti-tools", JSON.stringify(tools));
}

const STAGE_MAP: Record<string, { label: string; detail: string }> = {
  classifying: { label: "Understanding your question", detail: "Analyzing intent and complexity" },
  generating: { label: "Crafting your interactive tool", detail: "Generating a custom Worker module" },
  validating: { label: "Checking code safety", detail: "Validating structure and scanning for issues" },
  executing: { label: "Running in V8 sandbox", detail: "Fetching live data and building the page" },
  retrying: { label: "Fixing and retrying", detail: "First attempt had an issue, regenerating" },
};

const STAGE_ORDER = ["classifying", "generating", "validating", "executing"];

function BuildingPipeline({ currentStage, onBackground }: { currentStage: string | null; onBackground?: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [showNotifyBtn, setShowNotifyBtn] = useState(false);
  const [stageHistory, setStageHistory] = useState<string[]>([]);

  // Track stages as they arrive to build the visible list
  useEffect(() => {
    if (currentStage) {
      setStageHistory(prev => prev.includes(currentStage) ? prev : [...prev, currentStage]);
    }
  }, [currentStage]);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  // Show "notify me" button after 15 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowNotifyBtn(true), 15000);
    return () => clearTimeout(t);
  }, []);

  // Build the display list: use STAGE_ORDER as base, insert "retrying" if it appeared
  const displayStages = (() => {
    const stages = [...STAGE_ORDER];
    if (stageHistory.includes("retrying")) {
      const execIdx = stages.indexOf("executing");
      if (execIdx !== -1) {
        stages.splice(execIdx + 1, 0, "retrying");
      }
    }
    return stages;
  })();

  // Determine current stage index in displayStages
  const currentIdx = currentStage ? displayStages.indexOf(currentStage) : -1;

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${s}s`;
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Live elapsed — prominent timer */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-[#FFF7ED] border border-[#FDBA74] rounded-2xl">
            <div className="w-2.5 h-2.5 rounded-full bg-[#C2410C] animate-pulse" />
            <span className="text-sm font-semibold text-[#1C1917]">Building</span>
            <span className="text-2xl font-mono font-bold text-[#C2410C] tabular-nums" style={{ minWidth: "3ch" }}>{formatTime(elapsed)}</span>
          </div>
          <div className="text-xs text-[#A8A29E] mt-2.5">Usually takes 20-40 seconds</div>
        </div>

        {/* Phase list */}
        <div className="space-y-1">
          {displayStages.map((stageKey, i) => {
            const info = STAGE_MAP[stageKey] || { label: stageKey, detail: "" };
            const status = i < currentIdx ? "done" : i === currentIdx ? "active" : "waiting";
            return (
              <div
                key={stageKey + i}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                  status === "active" ? "bg-[#FFF7ED] border border-[#FDBA74]/40" : "border border-transparent"
                }`}
                style={status === "active" ? { animation: "subtlePulse 2s ease-in-out infinite" } : undefined}
              >
                {/* Status indicator */}
                <div className="mt-0.5 flex-shrink-0">
                  {status === "done" ? (
                    <div className="w-5 h-5 rounded-full bg-[#166534] flex items-center justify-center">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4 7L8 3" stroke="#FAFAFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : status === "active" ? (
                    <div className="w-5 h-5 rounded-full border-2 border-[#C2410C] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#C2410C] animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-[#E4E4E7]" />
                  )}
                </div>

                {/* Label + detail */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium transition-colors duration-300 ${
                    status === "done" ? "text-[#166534]" :
                    status === "active" ? "text-[#1C1917]" :
                    "text-[#D4D4D8]"
                  }`}>
                    {status === "done" ? (
                      <span className="flex items-center gap-1.5">
                        {info.label}
                      </span>
                    ) : info.label}
                  </div>
                  {status === "active" && (
                    <div className="text-xs text-[#A8A29E] mt-0.5 animate-[fadeIn_0.3s_ease]">
                      {info.detail}
                    </div>
                  )}
                  {status === "done" && (
                    <div className="text-xs text-[#86EFAC] mt-0.5 animate-[fadeIn_0.2s_ease]">
                      Done
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-6 h-1.5 bg-[#F4F4F5] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${((Math.max(0, currentIdx) + 1) / displayStages.length) * 100}%`,
              background: "linear-gradient(90deg, #C2410C, #EA580C)",
            }}
          />
        </div>

        {/* Notify me button — appears after 15s */}
        {showNotifyBtn && onBackground && (
          <div className="mt-8 text-center animate-[fadeIn_0.5s_ease]">
            <button
              type="button"
              onClick={onBackground}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#78716C] hover:text-[#C2410C] border border-[#E5E3DF] hover:border-[#C2410C] rounded-lg transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              Take me back — notify when ready
            </button>
          </div>
        )}
      </div>

      {/* Inline styles for custom animation */}
      <style>{`
        @keyframes subtlePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

function App() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem("yukti-onboarded"); } catch { return false; }
  });
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamStage, setStreamStage] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [toolUrl, setToolUrl] = useState<string | null>(null);
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [meta, setMeta] = useState<{
    tier: string; model: string; provider: string; retried: boolean;
    timing: { llmMs: number; execMs: number; totalMs: number; retryLlmMs?: number };
    granted?: string[];
    queryType?: string;
    promptVersion?: string;
    domainsFetched?: string[];
    validationWarnings?: string[];
    runId?: string;
    toolMeta?: {
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
    } | null;
  } | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"meta" | "output" | "code" | "capabilities">("meta");
  const [clarifying, setClarifying] = useState(false);
  const [clarifyQuestions, setClarifyQuestions] = useState<{
    id: string;
    question: string;
    options: string[];
    allowCustom: boolean;
  }[] | null>(null);
  const [clarifyAnswers, setClarifyAnswers] = useState<Record<string, string>>({});
  const [clarifyCustomInputs, setClarifyCustomInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [myTools, setMyTools] = useState<SavedTool[]>(getSavedTools);
  const [backgrounded, setBackgrounded] = useState(false);

  // Load saved tools from server on mount
  useEffect(() => {
    fetch("/api/me")
      .then(r => r.json())
      .then((data: { tools?: SavedTool[] }) => {
        if (data.tools?.length) {
          setMyTools(data.tools);
          // Sync to localStorage as fallback
          localStorage.setItem("yukti-tools", JSON.stringify(data.tools));
        }
      })
      .catch(() => {
        // Fall back to localStorage
        setMyTools(getSavedTools());
      });
  }, []);
  const [toolReady, setToolReady] = useState(false);
  const [mobileRefineOpen, setMobileRefineOpen] = useState(false);
  const [fallback, setFallback] = useState<{ reason: string; suggestion?: string } | null>(null);
  const backgroundedRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Keep ref in sync with state
  useEffect(() => { backgroundedRef.current = backgrounded; }, [backgrounded]);

  const handleBackground = () => {
    setBackgrounded(true);
    backgroundedRef.current = true;
  };

  const handleViewReady = () => {
    setBackgrounded(false);
    setToolReady(false);
  };

  const resetToHome = () => {
    setHtml(null); setCode(null); setMeta(null); setError(null);
    setRunId(null); setToolUrl(null); setQuery(""); setShowDetails(false);
    setRefineInput(""); setRefining(false); setMobileRefineOpen(false);
    setFallback(null);
  };

  const handleSave = async () => {
    if (!runId || !toolUrl) return;
    const tool: SavedTool = {
      runId,
      query: query,
      toolUrl,
      model: meta?.model || "",
      savedAt: new Date().toISOString(),
    };
    // Optimistic: update UI immediately
    saveTool(tool); // localStorage
    setSaved(true);
    setMyTools(prev => [tool, ...prev.filter(t => t.runId !== runId)].slice(0, 100));
    // Sync to server
    try {
      await fetch("/api/me/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tool),
      });
    } catch {} // fail silently, localStorage is the fallback
  };

  const handleRemoveTool = async (id: string) => {
    removeTool(id); // localStorage
    setMyTools(prev => prev.filter(t => t.runId !== id));
    try {
      await fetch("/api/me/tools", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: id }),
      });
    } catch {} // fail silently
  };

  const handleLoadTool = async (tool: SavedTool) => {
    setLoading(true);
    setHtml(null);
    setError(null);
    setQuery(tool.query);
    setRunId(tool.runId);
    setToolUrl(tool.toolUrl);
    try {
      const res = await fetch(tool.toolUrl);
      if (res.ok) {
        const loadedHtml = await res.text();
        setHtml(loadedHtml);
      } else {
        setError("Tool expired or not found");
      }
    } catch {
      setError("Failed to load saved tool");
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!refineInput.trim() || !code) return;
    setRefining(true);
    setError(null);
    setCopied(false);
    setSaved(false);

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, instruction: refineInput, topic: query }),
      });
      const text = await res.text();
      if (!text) { setError("Empty response"); return; }
      let data;
      try { data = JSON.parse(text); } catch { setError("Invalid response"); return; }
      if (data.ok && data.html) {
        setHtml(data.html);
        setCode(data.code || null);
        setRunId(data.runId);
        setToolUrl(data.toolUrl);
        if (data.meta) setMeta(data.meta);
        setRefineInput("");
      } else {
        setError(data.error || "Refinement failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRefining(false);
    }
  };

  const generate = useCallback(async (topic: string) => {
    if (!topic.trim()) return;
    setLoading(true);
    setStreamStage(null);
    setHtml(null);
    setCode(null);
    setRunId(null);
    setToolUrl(null);
    setMeta(null);
    setError(null);
    setFallback(null);
    setShowDetails(false);
    setCopied(false);
    setSaved(false);
    setRefineInput("");
    setRefining(false);
    setBackgrounded(false);
    setToolReady(false);

    try {
      const res = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      // Check for notToolWorthy JSON response (server returns JSON instead of SSE)
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json() as { ok?: boolean; notToolWorthy?: boolean; reason?: string; suggestion?: string; error?: string };
        if (data.notToolWorthy) {
          setFallback({ reason: data.reason || "This query isn't well-suited for interactive tool generation.", suggestion: data.suggestion });
          return;
        }
        if (!res.ok || data.error) {
          setError(data.error || "Server error");
          return;
        }
      }

      if (!res.ok) {
        // Non-streaming error (e.g. 400/500 before stream starts)
        const text = await res.text();
        let errMsg = "Server error";
        try { errMsg = JSON.parse(text).error || errMsg; } catch {}
        setError(errMsg);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Streaming not supported");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // Parse SSE events from buffer
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || ""; // last part may be incomplete

        for (const part of parts) {
          if (!part.trim()) continue;
          let eventType = "message";
          let dataStr = "";
          for (const line of part.split("\n")) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.slice(6);
            }
          }
          if (!dataStr) continue;

          try {
            const payload = JSON.parse(dataStr);
            if (eventType === "stage") {
              setStreamStage(payload.stage);
              console.log("[Yukti SSE] stage:", payload.stage, payload.detail);
            } else if (eventType === "complete") {
              console.log("[Yukti SSE] complete, html_len:", payload.html?.length);
              if (payload.ok && payload.html) {
                setHtml(payload.html);
                setCode(payload.code || null);
                setRunId(payload.runId);
                setToolUrl(payload.toolUrl);
                setMeta(payload.meta);
              } else {
                setError(payload.error || "Generation failed");
              }
            } else if (eventType === "error") {
              console.error("[Yukti SSE] error:", payload.error);
              setError(payload.error || "Generation failed");
            }
          } catch {
            console.warn("[Yukti SSE] Failed to parse event data:", dataStr.slice(0, 200));
          }
        }
      }
    } catch (err) {
      console.error("[Yukti] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
      setStreamStage(null);
      if (backgroundedRef.current) {
        setToolReady(true);
      }
    }
  }, []);

  const submitQuery = async (topic: string) => {
    if (!topic.trim()) return;
    // Reset clarification and fallback state
    setClarifying(true);
    setClarifyQuestions(null);
    setClarifyAnswers({});
    setClarifyCustomInputs({});
    setFallback(null);

    try {
      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json() as { action: string; questions?: { id: string; question: string; options: string[]; allowCustom: boolean }[] };

      if (data.action === "clarify" && data.questions?.length) {
        setClarifyQuestions(data.questions);
        setClarifying(false);
        return; // show clarification UI
      }
    } catch {
      // fail open — just build
    }

    setClarifying(false);
    setClarifyQuestions(null);
    generate(topic);
  };

  const handleClarifySubmit = () => {
    // Enrich the original query with answers
    const enrichments = Object.entries(clarifyAnswers)
      .map(([id, answer]) => {
        if (answer === "__custom__") return clarifyCustomInputs[id] || "";
        return answer;
      })
      .filter(Boolean);

    const enrichedQuery = query + " (" + enrichments.join(", ") + ")";
    setClarifyQuestions(null);
    setClarifyAnswers({});
    setClarifyCustomInputs({});
    generate(enrichedQuery);
  };

  const handleSubmit = (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (query.trim()) submitQuery(query);
  };

  const hasResult = !!(html || loading || error || runId || fallback);
  const showHome = !hasResult || backgrounded;
  const showClarification = !!(clarifyQuestions && clarifyQuestions.length > 0);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Tool ready notification banner */}
      {toolReady && backgrounded && (
        <div className="sticky top-0 z-[100] animate-[fadeIn_0.3s_ease]">
          <div className="bg-[#166534] text-white px-4 py-3 flex items-center justify-center gap-3">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="white" strokeWidth="1.5"/>
              <path d="M5 8L7 10L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-sm font-medium">Your tool is ready</span>
            <button
              type="button"
              onClick={handleViewReady}
              className="ml-2 px-4 py-1 text-sm font-semibold bg-white text-[#166534] rounded-lg hover:bg-[#F0FDF4] transition-all"
            >
              View
            </button>
          </div>
        </div>
      )}

      {/* Start screen — centered, no split */}
      {showHome && (
        <>
          <div className="max-w-2xl mx-auto px-5 pt-12 md:pt-20 pb-8">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1C1917] mb-1" style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "-0.03em" }}>
                Yukti
              </h1>
              <p className="text-xs uppercase tracking-[0.15em] text-[#A8A29E] font-semibold mb-8">
                Interactive tools, built on the fly
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3 text-[#1C1917]">
                What if every question had<br />an answer beyond text?
              </h2>
              <p className="text-base text-[#78716C]">
                Type anything. We'll build it.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mb-12">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                placeholder="How much tax do I pay on a 12L salary?"
                rows={2}
                className="w-full px-5 py-4 text-base bg-white border-[1.5px] border-[#D6D3D1] rounded-xl outline-none transition-all placeholder:text-[#A8A29E] focus:border-[#C2410C] focus:shadow-[0_0_0_3px_rgba(194,65,12,0.08)] resize-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="mt-3 w-full py-3 bg-[#C2410C] text-white text-sm font-semibold rounded-xl hover:bg-[#9A3412] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Go
              </button>
            </form>

            {/* Clarification UI */}
            {clarifying && (
              <div className="text-center py-6 text-sm text-[#78716C]">Analyzing your question...</div>
            )}

            {showClarification && (
              <div className="mb-8 bg-white border-[1.5px] border-[#E7E5E4] rounded-xl p-5">
                <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-[#A8A29E] mb-4">
                  Quick question{clarifyQuestions!.length > 1 ? "s" : ""} before we build
                </div>
                <div className="flex flex-col gap-5">
                  {clarifyQuestions!.map((q) => (
                    <div key={q.id}>
                      <div className="text-sm font-medium text-[#1C1917] mb-2">{q.question}</div>
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setClarifyAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                            className={`px-3.5 py-1.5 text-[13px] font-medium rounded-lg border transition-all ${
                              clarifyAnswers[q.id] === opt
                                ? "bg-[#C2410C] text-white border-[#C2410C]"
                                : "bg-[#FAFAF8] border-[#E5E3DF] text-[#44403C] hover:border-[#C2410C]"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                        {q.allowCustom && (
                          <button
                            type="button"
                            onClick={() => setClarifyAnswers((prev) => ({ ...prev, [q.id]: "__custom__" }))}
                            className={`px-3.5 py-1.5 text-[13px] font-medium rounded-lg border transition-all ${
                              clarifyAnswers[q.id] === "__custom__"
                                ? "bg-[#C2410C] text-white border-[#C2410C]"
                                : "bg-[#FAFAF8] border-[#E5E3DF] text-[#44403C] hover:border-[#C2410C]"
                            }`}
                          >
                            Other
                          </button>
                        )}
                      </div>
                      {clarifyAnswers[q.id] === "__custom__" && (
                        <input
                          type="text"
                          placeholder="Type your answer..."
                          value={clarifyCustomInputs[q.id] || ""}
                          onChange={(e) => setClarifyCustomInputs((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          className="mt-2 w-full px-3 py-2 text-sm bg-white border border-[#E5E3DF] rounded-lg outline-none focus:border-[#C2410C]"
                          autoFocus
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    type="button"
                    onClick={handleClarifySubmit}
                    disabled={Object.keys(clarifyAnswers).length === 0}
                    className="px-5 py-2 bg-[#C2410C] text-white text-sm font-semibold rounded-lg hover:bg-[#9A3412] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    Build it
                  </button>
                  <button
                    type="button"
                    onClick={() => { setClarifyQuestions(null); generate(query); }}
                    className="px-5 py-2 text-sm font-medium text-[#78716C] hover:text-[#1C1917] transition-colors"
                  >
                    Skip, build anyway
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {EXAMPLE_CATEGORIES.map((cat) => (
                <div
                  key={cat.label}
                  className="rounded-xl p-4 transition-shadow hover:shadow-md"
                  style={{ background: cat.bg, border: `1.5px solid ${cat.border}` }}
                >
                  <div
                    className="text-[11px] uppercase tracking-[0.08em] font-bold mb-3"
                    style={{ color: cat.color }}
                  >
                    {cat.label}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {cat.queries.map((q) => (
                      <button
                        type="button"
                        key={q}
                        onClick={() => { setQuery(q); submitQuery(q); }}
                        className="text-left text-[13px] font-medium text-[#1C1917] leading-snug transition-colors"
                        onMouseEnter={(e) => (e.currentTarget.style.color = cat.color)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#1C1917")}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* My Tools */}
            {myTools.length > 0 && (
              <div className="mt-10">
                <div className="text-[11px] uppercase tracking-[0.08em] font-bold text-[#A8A29E] mb-3">My Tools</div>
                <div className="flex flex-col gap-2">
                  {myTools.map((tool) => (
                    <div
                      key={tool.runId}
                      className="flex items-center gap-3 bg-white border-[1.5px] border-[#E7E5E4] rounded-lg px-4 py-3 hover:border-[#C2410C] transition-all group"
                    >
                      <button
                        type="button"
                        onClick={() => handleLoadTool(tool)}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm font-medium text-[#1C1917] leading-snug">{tool.query}</div>
                        <div className="text-[11px] text-[#A8A29E] mt-0.5">
                          {new Date(tool.savedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          {" · "}
                          {tool.model.split("/").pop()}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setQuery(tool.query); generate(tool.query); }}
                        className="text-[#A8A29E] hover:text-[#C2410C] transition-colors text-xs opacity-0 group-hover:opacity-100"
                        title="Regenerate with same query"
                      >
                        Fork
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          navigator.clipboard.writeText(window.location.origin + tool.toolUrl);
                          const btn = e.currentTarget;
                          btn.textContent = "\u2713 Copied!";
                          btn.className = "text-[#166534] bg-[#F0FDF4] rounded px-1 transition-colors text-xs";
                          setTimeout(() => { btn.textContent = "Share"; btn.className = "text-[#A8A29E] hover:text-[#C2410C] transition-colors text-xs opacity-0 group-hover:opacity-100"; }, 2000);
                        }}
                        className="text-[#A8A29E] hover:text-[#C2410C] transition-colors text-xs opacity-0 group-hover:opacity-100"
                        title="Copy share link"
                      >
                        Share
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTool(tool.runId)}
                        className="text-[#A8A29E] hover:text-[#DC2626] transition-colors text-xs opacity-0 group-hover:opacity-100"
                        title="Remove"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Split screen — query left, result right (desktop) */}
      {hasResult && !backgrounded && (
        <div className="h-screen flex flex-col md:flex-row">
          {/* Left panel — query (hidden on mobile) */}
          <div className="hidden md:flex md:w-[380px] md:min-w-[380px] bg-[#F0EDE8] border-r border-[#E5E3DF] flex-col h-screen">
            <div className="px-5 py-5 border-b border-[#E5E3DF] text-center">
              <h1
                onClick={resetToHome}
                className="text-2xl font-bold tracking-tight text-[#1C1917] cursor-pointer hover:text-[#C2410C] transition-colors"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "-0.03em" }}
              >Yukti</h1>
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#A8A29E] font-semibold mt-0.5">Interactive tools, built on the fly</p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <form onSubmit={handleSubmit} className="mb-5">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                  placeholder="Ask another question..."
                  rows={3}
                  className="w-full px-4 py-3 text-sm bg-white border border-[#E5E3DF] rounded-lg outline-none resize-none placeholder:text-[#9B9B9B] focus:border-[#C85A1A]"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="mt-2 w-full py-2.5 bg-[#C85A1A] text-white text-sm font-medium rounded-lg hover:bg-[#A5491A] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Building..." : "Go"}
                </button>
              </form>

              {/* Saved tools in sidebar */}
              {myTools.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.08em] font-bold text-[#A8A29E] mb-2">Recent tools</div>
                  <div className="flex flex-col gap-1.5">
                    {myTools.slice(0, 8).map((tool) => (
                      <button
                        type="button"
                        key={tool.runId}
                        onClick={() => handleLoadTool(tool)}
                        disabled={loading}
                        className="text-left text-xs text-[#57534E] hover:text-[#C2410C] leading-snug disabled:opacity-30 transition-colors truncate"
                      >
                        {tool.query}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-5 p-3 bg-[#FEF5F5] border border-[#F5D5D5] rounded-lg text-[#C43E3E] text-sm">
                  {error}
                </div>
              )}
            </div>

            {(meta || runId) && (
              <div className="border-t border-[#E5E3DF]">
                {/* Save + Share */}
                {toolUrl && (
                  <div className="px-5 py-3 border-b border-[#E5E3DF] flex gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saved}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                        saved
                          ? "bg-[#F0FDF4] border border-[#86EFAC] text-[#166534]"
                          : "bg-[#C2410C] text-white hover:bg-[#9A3412]"
                      }`}
                    >
                      {saved ? "Saved" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin + toolUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                        copied
                          ? "bg-[#F0FDF4] border border-[#86EFAC] text-[#166534]"
                          : "border border-[#D6D3D1] hover:border-[#C2410C] hover:text-[#C2410C]"
                      }`}
                    >
                      {copied ? "\u2713 Copied!" : "Share"}
                    </button>
                  </div>
                )}

                {/* Timing details */}
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full px-5 py-2.5 text-left text-xs text-[#9B9B9B] hover:text-[#57534E] transition-colors flex justify-between items-center"
                >
                  <span>{meta ? meta.model.split("/").pop() : ""}</span>
                  <span>{meta?.timing ? (meta.timing.totalMs / 1000).toFixed(1) + "s" : ""}</span>
                </button>

                {showDetails && meta?.timing && (
                  <div className="px-5 pb-3 text-xs text-[#9B9B9B] space-y-1">
                    <div className="flex justify-between"><span>LLM generation</span><span>{(meta.timing.llmMs / 1000).toFixed(1)}s</span></div>
                    <div className="flex justify-between"><span>Sandbox execution</span><span>{(meta.timing.execMs / 1000).toFixed(1)}s</span></div>
                    {meta.retried && meta.timing.retryLlmMs && (
                      <div className="flex justify-between text-[#D97706]"><span>Retry (code fix)</span><span>{(meta.timing.retryLlmMs / 1000).toFixed(1)}s</span></div>
                    )}
                    <div className="flex justify-between font-medium text-[#57534E]"><span>Total</span><span>{(meta.timing.totalMs / 1000).toFixed(1)}s</span></div>
                    {runId && <div className="mt-1 text-[10px] font-mono text-[#A8A29E]">Run: {runId}</div>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile header — compact, with back arrow */}
          <div className="md:hidden sticky top-0 z-50 border-b border-[#E7E5E4] bg-white/95 backdrop-blur-sm">
            <div className="flex items-center px-3 py-2.5">
              <button type="button" onClick={resetToHome} className="p-1 -ml-1 text-[#78716C] hover:text-[#1C1917] transition-colors">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <div className="flex-1 text-center">
                <span className="text-lg font-bold tracking-tight text-[#1C1917]" style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "-0.03em" }}>Yukti</span>
              </div>
              <div className="w-6" />
            </div>
            {query && html && !loading && (
              <div className="px-4 pb-2 -mt-1">
                <div className="text-xs text-[#78716C] truncate">{query}</div>
              </div>
            )}
          </div>

          {/* Right panel — output */}
          <div className="flex-1 bg-white flex flex-col min-h-[50vh] md:h-screen">
            {loading && !refining && <BuildingPipeline currentStage={streamStage} onBackground={handleBackground} />}
            {fallback && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                <div className="max-w-sm">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#C2410C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-[#1C1917] mb-2">
                    Yukti builds interactive tools
                  </h3>
                  <p className="text-sm text-[#78716C] mb-6">
                    {fallback.reason}
                  </p>
                  {fallback.suggestion && (
                    <div className="text-left bg-[#FFF7ED] border border-[#FDBA74] rounded-xl p-4 mb-4">
                      <div className="text-[11px] uppercase tracking-[0.08em] font-bold text-[#C2410C] mb-2">Try something like</div>
                      <div className="flex flex-col gap-2">
                        {fallback.suggestion.split("\n").filter(Boolean).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => { setQuery(s); setFallback(null); submitQuery(s); }}
                            className="text-left text-[13px] font-medium text-[#1C1917] hover:text-[#C2410C] transition-colors leading-snug"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={resetToHome} className="text-sm text-[#78716C] hover:text-[#C2410C] transition-colors">
                    &larr; Back to home
                  </button>
                </div>
              </div>
            )}
            {refining && (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-4 w-4 text-[#C2410C]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm text-[#6B6B6B]">Refining...</span>
                </div>
              </div>
            )}
            {html && !refining && (
              <>
                <iframe
                  ref={iframeRef}
                  srcDoc={html}
                  className="flex-1 w-full border-none pb-[56px] md:pb-0"
                  sandbox="allow-scripts"
                  title="Interactive Tool"
                />
                {/* Inspector + Refine bar (desktop only) */}
                {code && (
                  <div className="hidden md:block border-t border-[#E7E5E4]">
                    {/* Inspector + Refresh bar */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#F5F4F0]">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setShowInspector(!showInspector)}
                          className="text-sm text-[#78716C] hover:text-[#57534E] transition-colors flex items-center gap-1.5 font-medium"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: showInspector ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>
                            <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Inspector
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!code) return;
                            setRefining(true);
                            try {
                              const res = await fetch("/api/rerun", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ code, topic: query }),
                              });
                              const text = await res.text();
                              const data = JSON.parse(text);
                              if (data.ok) {
                                setHtml(data.html);
                                setRunId(data.runId);
                                setToolUrl(data.toolUrl);
                                setSaved(false);
                                setCopied(false);
                              }
                            } catch {} finally { setRefining(false); }
                          }}
                          className="text-sm text-[#78716C] hover:text-[#C2410C] transition-colors font-medium"
                          title="Re-run the same code to refresh live data"
                        >
                          Refresh
                        </button>
                      </div>
                      {meta?.granted && meta.granted.length > 0 && (
                        <div className="hidden md:flex items-center gap-2 text-xs text-[#A8A29E]">
                          {meta.granted.map(cap => (
                            <span key={cap} className="px-2 py-0.5 bg-white rounded text-[11px] font-medium">{cap}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Inspector panel */}
                    {showInspector && (
                      <div className="bg-[#1C1917] text-[#E7E5E4] max-h-[300px] overflow-auto">
                        {/* Tab bar */}
                        <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-[#44403C]">
                          {(["meta", "output", "code", "capabilities"] as const).map(tab => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setInspectorTab(tab)}
                              className={`px-3 py-1 text-[11px] font-medium rounded-full transition-all ${
                                inspectorTab === tab
                                  ? "bg-[#44403C] text-[#FAFAF8]"
                                  : "text-[#78716C] hover:text-[#A8A29E]"
                              }`}
                            >
                              {tab === "meta" ? "Meta" : tab === "output" ? "Output" : tab === "code" ? "Code" : "Capabilities"}
                            </button>
                          ))}
                        </div>

                        {/* Tab: Meta */}
                        {inspectorTab === "meta" && (
                          <div className="px-4 py-3 text-xs space-y-1.5">
                            <div className="flex justify-between"><span className="text-[#A8A29E]">Run ID</span><span className="font-mono">{runId}</span></div>
                            <div className="flex justify-between"><span className="text-[#A8A29E]">Model</span><span>{meta?.model?.split("/").pop()}</span></div>
                            {meta?.tier && (
                              <div className="flex justify-between"><span className="text-[#A8A29E]">Tier</span><span className="px-1.5 py-0.5 bg-[#44403C] rounded text-[10px] font-medium">{meta.tier}</span></div>
                            )}
                            {meta?.queryType && (
                              <div className="flex justify-between"><span className="text-[#A8A29E]">Query Type</span><span className="px-1.5 py-0.5 bg-[#3B2F2F] rounded text-[10px] font-medium text-[#FBBF24]">{meta.queryType}</span></div>
                            )}
                            {meta?.promptVersion && (
                              <div className="flex justify-between"><span className="text-[#A8A29E]">Prompt Version</span><span className="font-mono">{meta.promptVersion}</span></div>
                            )}
                            {meta?.timing && (
                              <>
                                <div className="flex justify-between"><span className="text-[#A8A29E]">LLM Time</span><span>{(meta.timing.llmMs / 1000).toFixed(1)}s</span></div>
                                <div className="flex justify-between"><span className="text-[#A8A29E]">Sandbox Time</span><span>{(meta.timing.execMs / 1000).toFixed(1)}s</span></div>
                                {meta.retried && <div className="flex justify-between text-[#FBBF24]"><span>Retried</span><span>Yes</span></div>}
                                <div className="flex justify-between font-medium"><span className="text-[#A8A29E]">Total</span><span>{(meta.timing.totalMs / 1000).toFixed(1)}s</span></div>
                              </>
                            )}
                            {meta?.domainsFetched && meta.domainsFetched.length > 0 && (
                              <div className="flex justify-between items-start">
                                <span className="text-[#A8A29E]">Domains Fetched</span>
                                <div className="flex flex-wrap gap-1 justify-end">
                                  {meta.domainsFetched.map(d => (
                                    <span key={d} className="px-1.5 py-0.5 bg-[#44403C] rounded text-[10px] font-mono">{d}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {meta?.validationWarnings && meta.validationWarnings.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <span className="text-[#D97706] text-[10px] uppercase tracking-wider font-semibold">Validation Warnings</span>
                                {meta.validationWarnings.map((w, i) => (
                                  <div key={i} className="text-[11px] text-[#FBBF24] bg-[#3B2F1A] px-2 py-1 rounded">{w}</div>
                                ))}
                              </div>
                            )}
                            {meta?.granted && meta.granted.length > 0 && (
                              <div className="flex justify-between items-start">
                                <span className="text-[#A8A29E]">Capabilities</span>
                                <div className="flex flex-wrap gap-1 justify-end">
                                  {meta.granted.map(cap => (
                                    <span key={cap} className="px-1.5 py-0.5 bg-[#44403C] rounded text-[10px] font-medium text-[#FBBF24]">{cap}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tab: Output (structured metadata) */}
                        {inspectorTab === "output" && (
                          <div className="px-4 py-3 text-xs space-y-3">
                            {meta?.toolMeta ? (
                              <>
                                {/* Tool type badge + title */}
                                <div className="flex items-center gap-2">
                                  {meta.toolMeta.toolType && (
                                    <span className="px-2 py-0.5 bg-[#C2410C] text-white rounded text-[10px] font-semibold uppercase tracking-wider">{meta.toolMeta.toolType}</span>
                                  )}
                                  {meta.toolMeta.title && (
                                    <span className="text-[#FAFAF8] font-medium">{meta.toolMeta.title}</span>
                                  )}
                                </div>

                                {/* Inputs */}
                                {meta.toolMeta.inputs && meta.toolMeta.inputs.length > 0 && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider text-[#78716C] mb-1">Inputs</div>
                                    <div className="flex flex-wrap gap-1">
                                      {meta.toolMeta.inputs.map(inp => (
                                        <span key={inp} className="px-2 py-0.5 bg-[#44403C] rounded text-[10px] font-medium text-[#FBBF24]">{inp}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Data sources */}
                                {meta.toolMeta.dataSources && meta.toolMeta.dataSources.length > 0 && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider text-[#78716C] mb-1">Data Sources</div>
                                    <div className="space-y-1">
                                      {meta.toolMeta.dataSources.map((ds, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${ds.live ? "bg-[#4ADE80]" : "bg-[#78716C]"}`} />
                                          <span className="text-[#E7E5E4]">{ds.name}</span>
                                          {ds.url && <span className="text-[#78716C] font-mono text-[10px]">{ds.url}</span>}
                                          <span className="text-[10px] text-[#A8A29E]">{ds.live ? "live" : "static"}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Assumptions */}
                                {meta.toolMeta.assumptions && meta.toolMeta.assumptions.length > 0 && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider text-[#78716C] mb-1">Assumptions</div>
                                    <ul className="space-y-0.5 text-[#D6D3D1]">
                                      {meta.toolMeta.assumptions.map((a, i) => (
                                        <li key={i} className="flex items-start gap-1.5">
                                          <span className="text-[#78716C] mt-0.5">&#8226;</span>
                                          <span>{a}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Limitations */}
                                {meta.toolMeta.limitations && meta.toolMeta.limitations.length > 0 && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider text-[#D97706] mb-1">Limitations</div>
                                    <ul className="space-y-0.5 text-[#FBBF24]">
                                      {meta.toolMeta.limitations.map((l, i) => (
                                        <li key={i} className="flex items-start gap-1.5">
                                          <span className="text-[#D97706] mt-0.5">&#8226;</span>
                                          <span>{l}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Computed values */}
                                {meta.toolMeta.computedValues && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider text-[#78716C] mb-1">Computed Values</div>
                                    {meta.toolMeta.computedValues.primaryMetric && (
                                      <div className="bg-[#2A2520] rounded-lg px-3 py-2 mb-2">
                                        <div className="text-[10px] text-[#A8A29E]">{meta.toolMeta.computedValues.primaryMetric.label}</div>
                                        <div className="text-base font-semibold text-[#FAFAF8]">
                                          {meta.toolMeta.computedValues.primaryMetric.value}
                                          {meta.toolMeta.computedValues.primaryMetric.unit && (
                                            <span className="text-xs text-[#78716C] ml-1">{meta.toolMeta.computedValues.primaryMetric.unit}</span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {meta.toolMeta.computedValues.secondaryMetrics && meta.toolMeta.computedValues.secondaryMetrics.length > 0 && (
                                      <div className="grid grid-cols-2 gap-2">
                                        {meta.toolMeta.computedValues.secondaryMetrics.map((m, i) => (
                                          <div key={i} className="bg-[#44403C] rounded px-2 py-1.5">
                                            <div className="text-[10px] text-[#A8A29E]">{m.label}</div>
                                            <div className="text-sm font-medium text-[#E7E5E4]">{m.value}</div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-[#78716C] text-center py-4">
                                No structured metadata — tool was generated without the metadata contract
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tab: Code */}
                        {inspectorTab === "code" && (
                          <div className="px-4 py-2">
                            <div className="text-[10px] uppercase tracking-wider text-[#78716C] mb-1">Generated Worker Code</div>
                            <pre className="text-[11px] leading-relaxed font-mono text-[#D6D3D1] whitespace-pre-wrap break-all">{code}</pre>
                          </div>
                        )}

                        {/* Tab: Capabilities */}
                        {inspectorTab === "capabilities" && (
                          <div className="px-4 py-3 space-y-2">
                            {(() => {
                              const capDescriptions: Record<string, string> = {
                                "finance-apis": "Stock prices, crypto, mutual funds, currency exchange",
                                "weather-apis": "Weather forecasts, air quality, sunrise/sunset",
                                "google-knowledge": "Knowledge Graph entities",
                                "youtube": "Video search and stats",
                                "india-commodity-prices": "Live mandi prices from data.gov.in",
                                "usda-nutrition": "USDA FoodData Central",
                                "india-utilities": "PIN codes, IFSC codes",
                                "general": "Public APIs (no keys required)",
                              };
                              const granted = meta?.granted || [];
                              return Object.entries(capDescriptions).map(([key, desc]) => {
                                const isGranted = granted.includes(key);
                                return (
                                  <div key={key} className={`flex items-start gap-3 px-3 py-2 rounded-lg ${isGranted ? "bg-[#2A2520]" : "opacity-40"}`}>
                                    <span className={`mt-0.5 flex-shrink-0 inline-block w-2 h-2 rounded-full ${isGranted ? "bg-[#4ADE80]" : "bg-[#57534E]"}`} />
                                    <div>
                                      <span className={`text-xs font-semibold ${isGranted ? "text-[#FBBF24]" : "text-[#78716C]"}`}>{key}</span>
                                      <div className="text-[11px] text-[#A8A29E] mt-0.5">{desc}</div>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Refine bar */}
                    <div className="bg-[#FAFAF8] px-4 py-3">
                      <div className="max-w-2xl mx-auto flex gap-2">
                        <input
                          type="text"
                          value={refineInput}
                          onChange={(e) => setRefineInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleRefine(); } }}
                          placeholder="Refine: add a column, change currency, make chart bigger..."
                          className="flex-1 px-4 py-2.5 text-sm bg-white border-[1.5px] border-[#D6D3D1] rounded-lg outline-none placeholder:text-[#A8A29E] focus:border-[#C2410C]"
                          disabled={refining}
                        />
                        <button
                          type="button"
                          onClick={handleRefine}
                          disabled={refining || !refineInput.trim()}
                          className="px-5 py-2.5 text-sm font-medium bg-[#C2410C] text-white rounded-lg hover:bg-[#9A3412] disabled:opacity-30 transition-all"
                        >
                          Refine
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {/* Mobile bottom action bar */}
      {html && !loading && !backgrounded && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-[#E7E5E4] px-2 py-2 flex items-center justify-around safe-area-bottom">
          <button type="button" onClick={resetToHome} className="flex flex-col items-center gap-0.5 text-[#78716C] active:text-[#C2410C] transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 4V14M4 9H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <span className="text-[10px] font-medium">New</span>
          </button>
          {code && (
            <button type="button" onClick={() => setMobileRefineOpen(true)} className="flex flex-col items-center gap-0.5 text-[#78716C] active:text-[#C2410C] transition-colors">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M13.5 2.5L15.5 4.5L6 14H4V12L13.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="text-[10px] font-medium">Refine</span>
            </button>
          )}
          {toolUrl && (
            <button type="button" onClick={handleSave} className={`flex flex-col items-center gap-0.5 transition-colors ${saved ? "text-[#166534]" : "text-[#78716C] active:text-[#C2410C]"}`}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 3V15L9 12L14 15V3H4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={saved ? "currentColor" : "none"}/></svg>
              <span className="text-[10px] font-medium">{saved ? "Saved" : "Save"}</span>
            </button>
          )}
          {toolUrl && (
            <button type="button" onClick={() => { navigator.clipboard.writeText(window.location.origin + toolUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={`flex flex-col items-center gap-0.5 transition-colors ${copied ? "text-[#166534]" : "text-[#78716C] active:text-[#C2410C]"}`}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 7V4H14V11H11M4 7H11V14H4V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="text-[10px] font-medium">{copied ? "Copied" : "Share"}</span>
            </button>
          )}
          {code && (
            <button type="button" onClick={() => setShowInspector(!showInspector)} className={`flex flex-col items-center gap-0.5 transition-colors ${showInspector ? "text-[#C2410C]" : "text-[#78716C] active:text-[#C2410C]"}`}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5"/><path d="M9 7V9.5M9 11.5H9.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <span className="text-[10px] font-medium">Info</span>
            </button>
          )}
        </div>
      )}

      {/* Mobile refine sheet */}
      {mobileRefineOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/30 animate-[fadeIn_0.15s_ease]" onClick={() => setMobileRefineOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-5 pb-8 animate-[slideUp_0.2s_ease]" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-[#D6D3D1] rounded-full mx-auto mb-4" />
            <div className="text-sm font-semibold text-[#1C1917] mb-3">Refine this tool</div>
            <input
              type="text"
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleRefine(); setMobileRefineOpen(false); } }}
              placeholder="Add a column, change currency, make chart bigger..."
              className="w-full px-4 py-3 text-sm bg-[#FAFAF8] border-[1.5px] border-[#D6D3D1] rounded-xl outline-none placeholder:text-[#A8A29E] focus:border-[#C2410C]"
              autoFocus
            />
            <button
              type="button"
              onClick={() => { handleRefine(); setMobileRefineOpen(false); }}
              disabled={!refineInput.trim()}
              className="mt-3 w-full py-3 bg-[#C2410C] text-white text-sm font-semibold rounded-xl hover:bg-[#9A3412] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Refine
            </button>
          </div>
        </div>
      )}

      {/* Mobile inspector sheet */}
      {showInspector && html && !loading && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/30 animate-[fadeIn_0.15s_ease]" onClick={() => setShowInspector(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-[#1C1917] text-[#E7E5E4] rounded-t-2xl max-h-[70vh] overflow-auto animate-[slideUp_0.2s_ease]" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#1C1917] z-10">
              <div className="w-10 h-1 bg-[#44403C] rounded-full mx-auto mt-3 mb-2" />
              <div className="px-4 pb-2 flex items-center gap-2 border-b border-[#44403C]">
                {(["meta", "output", "code", "capabilities"] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setInspectorTab(tab)}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-all ${
                      inspectorTab === tab
                        ? "bg-[#44403C] text-[#FAFAF8]"
                        : "text-[#78716C] hover:text-[#A8A29E]"
                    }`}
                  >
                    {tab === "meta" ? "Meta" : tab === "output" ? "Output" : tab === "code" ? "Code" : "Capabilities"}
                  </button>
                ))}
              </div>
            </div>

            {inspectorTab === "meta" && (
              <div className="px-4 py-3 text-xs space-y-1.5">
                <div className="flex justify-between"><span className="text-[#A8A29E]">Run ID</span><span className="font-mono text-[11px]">{runId}</span></div>
                <div className="flex justify-between"><span className="text-[#A8A29E]">Model</span><span>{meta?.model?.split("/").pop()}</span></div>
                {meta?.tier && <div className="flex justify-between"><span className="text-[#A8A29E]">Tier</span><span className="px-1.5 py-0.5 bg-[#44403C] rounded text-[10px] font-medium">{meta.tier}</span></div>}
                {meta?.queryType && <div className="flex justify-between"><span className="text-[#A8A29E]">Query Type</span><span className="px-1.5 py-0.5 bg-[#3B2F2F] rounded text-[10px] font-medium text-[#FBBF24]">{meta.queryType}</span></div>}
                {meta?.timing && (
                  <>
                    <div className="flex justify-between"><span className="text-[#A8A29E]">LLM Time</span><span>{(meta.timing.llmMs / 1000).toFixed(1)}s</span></div>
                    <div className="flex justify-between"><span className="text-[#A8A29E]">Sandbox Time</span><span>{(meta.timing.execMs / 1000).toFixed(1)}s</span></div>
                    <div className="flex justify-between font-medium"><span className="text-[#A8A29E]">Total</span><span>{(meta.timing.totalMs / 1000).toFixed(1)}s</span></div>
                  </>
                )}
                {meta?.granted && meta.granted.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {meta.granted.map(cap => (
                      <span key={cap} className="px-1.5 py-0.5 bg-[#44403C] rounded text-[10px] font-medium text-[#FBBF24]">{cap}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {inspectorTab === "output" && (
              <div className="px-4 py-3 text-xs space-y-3 pb-8">
                {meta?.toolMeta ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      {meta.toolMeta.toolType && (
                        <span className="px-2 py-0.5 bg-[#C2410C] text-white rounded text-[10px] font-semibold uppercase tracking-wider">{meta.toolMeta.toolType}</span>
                      )}
                      {meta.toolMeta.title && (
                        <span className="text-[#FAFAF8] font-medium">{meta.toolMeta.title}</span>
                      )}
                    </div>
                    {meta.toolMeta.inputs && meta.toolMeta.inputs.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#78716C] mb-1">Inputs</div>
                        <div className="flex flex-wrap gap-1">
                          {meta.toolMeta.inputs.map(inp => (
                            <span key={inp} className="px-2 py-0.5 bg-[#44403C] rounded text-[10px] font-medium text-[#FBBF24]">{inp}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {meta.toolMeta.dataSources && meta.toolMeta.dataSources.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#78716C] mb-1">Data Sources</div>
                        <div className="space-y-1">
                          {meta.toolMeta.dataSources.map((ds, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${ds.live ? "bg-[#4ADE80]" : "bg-[#78716C]"}`} />
                              <span className="text-[#E7E5E4]">{ds.name}</span>
                              <span className="text-[10px] text-[#A8A29E]">{ds.live ? "live" : "static"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {meta.toolMeta.assumptions && meta.toolMeta.assumptions.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#78716C] mb-1">Assumptions</div>
                        <ul className="space-y-0.5 text-[#D6D3D1]">
                          {meta.toolMeta.assumptions.map((a, i) => (
                            <li key={i} className="flex items-start gap-1.5"><span className="text-[#78716C] mt-0.5">&#8226;</span><span>{a}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {meta.toolMeta.limitations && meta.toolMeta.limitations.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#D97706] mb-1">Limitations</div>
                        <ul className="space-y-0.5 text-[#FBBF24]">
                          {meta.toolMeta.limitations.map((l, i) => (
                            <li key={i} className="flex items-start gap-1.5"><span className="text-[#D97706] mt-0.5">&#8226;</span><span>{l}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {meta.toolMeta.computedValues?.primaryMetric && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#78716C] mb-1">Primary Metric</div>
                        <div className="bg-[#2A2520] rounded-lg px-3 py-2">
                          <div className="text-[10px] text-[#A8A29E]">{meta.toolMeta.computedValues.primaryMetric.label}</div>
                          <div className="text-base font-semibold text-[#FAFAF8]">
                            {meta.toolMeta.computedValues.primaryMetric.value}
                            {meta.toolMeta.computedValues.primaryMetric.unit && (
                              <span className="text-xs text-[#78716C] ml-1">{meta.toolMeta.computedValues.primaryMetric.unit}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[#78716C] text-center py-4">
                    No structured metadata — tool was generated without the metadata contract
                  </div>
                )}
              </div>
            )}

            {inspectorTab === "code" && (
              <div className="px-4 py-2">
                <pre className="text-[11px] leading-relaxed font-mono text-[#D6D3D1] whitespace-pre-wrap break-all">{code}</pre>
              </div>
            )}

            {inspectorTab === "capabilities" && (
              <div className="px-4 py-3 space-y-2 pb-8">
                {(() => {
                  const capDescriptions: Record<string, string> = {
                    "finance-apis": "Stock prices, crypto, mutual funds",
                    "weather-apis": "Weather forecasts, air quality",
                    "google-knowledge": "Knowledge Graph entities",
                    "youtube": "Video search and stats",
                    "general": "Public APIs (no keys required)",
                  };
                  const granted = meta?.granted || [];
                  return Object.entries(capDescriptions).map(([key, desc]) => {
                    const isGranted = granted.includes(key);
                    return (
                      <div key={key} className={`flex items-start gap-3 px-3 py-2 rounded-lg ${isGranted ? "bg-[#2A2520]" : "opacity-40"}`}>
                        <span className={`mt-0.5 flex-shrink-0 inline-block w-2 h-2 rounded-full ${isGranted ? "bg-[#4ADE80]" : "bg-[#57534E]"}`} />
                        <div>
                          <span className={`text-xs font-semibold ${isGranted ? "text-[#FBBF24]" : "text-[#78716C]"}`}>{key}</span>
                          <div className="text-[11px] text-[#A8A29E] mt-0.5">{desc}</div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onboarding overlay for first-time visitors */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[200] bg-[#FAFAF8] flex flex-col items-center justify-center">
          {onboardingStep === 0 && (
            <div className="text-center px-6 max-w-lg animate-[fadeIn_0.8s_ease]">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1C1917] leading-tight mb-4"
                  style={{ fontFamily: "'Georgia', serif" }}>
                You ask a question.<br/>We build you a tool.
              </h1>
              <p className="text-lg text-[#78716C] mb-10">
                Not a chatbot answer. A live, interactive tool.
              </p>
              <button onClick={() => setOnboardingStep(1)}
                      className="px-8 py-3 bg-[#C2410C] text-white text-base font-semibold rounded-xl hover:bg-[#9A3412] transition-all">
                See how &rarr;
              </button>
              <div className="mt-6">
                <button onClick={() => { localStorage.setItem("yukti-onboarded", "1"); setShowOnboarding(false); }}
                        className="text-sm text-[#A8A29E] hover:text-[#78716C] transition-colors">
                  Skip intro
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 1 && (
            <div className="w-full max-w-2xl px-6 animate-[fadeIn_0.6s_ease]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Question */}
                <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-sm">
                  <div className="text-[11px] uppercase tracking-wider text-[#A8A29E] font-semibold mb-3">You ask</div>
                  <p className="text-lg font-medium text-[#1C1917]">"I earn 12L, how much tax?"</p>
                </div>

                {/* Tool mockup */}
                <div className="bg-[#f5ede0] rounded-2xl border border-[#E7E5E4] p-6 shadow-sm">
                  <div className="text-[11px] uppercase tracking-wider text-[#C2410C] font-semibold mb-3">You get</div>
                  <div className="space-y-3">
                    {/* Fake slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#44403C] font-medium">Annual Income</span>
                        <span className="text-[#C2410C] font-semibold bg-[#FFF7ED] px-2 py-0.5 rounded">&#8377;12,00,000</span>
                      </div>
                      <div className="h-2 bg-[#E7E5E4] rounded-full overflow-hidden">
                        <div className="h-full bg-[#C2410C] rounded-full" style={{ width: "45%", animation: "sliderPulse 3s ease-in-out infinite" }} />
                      </div>
                    </div>
                    {/* Fake output */}
                    <div className="bg-[#1C1917] rounded-xl p-4 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-[#A8A29E] mb-1">Total Tax</div>
                      <div className="text-2xl font-bold text-[#FAFAF8]">&#8377;1,17,000</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white rounded-lg p-2 text-center">
                        <div className="text-[9px] uppercase text-[#A8A29E]">Rate</div>
                        <div className="text-sm font-semibold text-[#1C1917]">9.8%</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center">
                        <div className="text-[9px] uppercase text-[#A8A29E]">Monthly</div>
                        <div className="text-sm font-semibold text-[#1C1917]">&#8377;9,750</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-[#78716C] mt-8 mb-6">
                Custom-built in seconds using AI + secure sandboxing
              </p>
              <div className="text-center">
                <button onClick={() => { setOnboardingStep(2); if (!query) setQuery("I earn 12L, how much tax do I pay?"); }}
                        className="px-8 py-3 bg-[#C2410C] text-white text-base font-semibold rounded-xl hover:bg-[#9A3412] transition-all">
                  Try it yourself &rarr;
                </button>
                <div className="mt-4">
                  <button onClick={() => { localStorage.setItem("yukti-onboarded", "1"); setShowOnboarding(false); }}
                          className="text-sm text-[#A8A29E] hover:text-[#78716C] transition-colors">
                    Skip intro
                  </button>
                </div>
              </div>
            </div>
          )}

          {onboardingStep === 2 && (
            <div className="w-full max-w-lg px-6 text-center animate-[fadeIn_0.6s_ease]">
              <h2 className="text-2xl font-bold text-[#1C1917] mb-2" style={{ fontFamily: "'Georgia', serif" }}>Your turn</h2>
              <p className="text-sm text-[#78716C] mb-6">Type anything, or try this one</p>
              <form onSubmit={(e) => {
                e.preventDefault();
                localStorage.setItem("yukti-onboarded", "1");
                setShowOnboarding(false);
                if (query.trim()) submitQuery(query);
              }}>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                  placeholder="How much tax do I pay on a 12L salary?"
                  rows={2}
                  className="w-full px-5 py-4 text-base bg-white border-[1.5px] border-[#D6D3D1] rounded-xl outline-none transition-all placeholder:text-[#A8A29E] focus:border-[#C2410C] focus:shadow-[0_0_0_3px_rgba(194,65,12,0.08)] resize-none"
                  autoFocus
                />
                <button type="submit" disabled={!query.trim()}
                        className="mt-3 w-full py-3 bg-[#C2410C] text-white text-sm font-semibold rounded-xl hover:bg-[#9A3412] disabled:opacity-30 transition-all">
                  Build my tool &rarr;
                </button>
              </form>
              <button onClick={() => { localStorage.setItem("yukti-onboarded", "1"); setShowOnboarding(false); }}
                      className="mt-4 text-sm text-[#A8A29E] hover:text-[#78716C] transition-colors">
                Skip intro
              </button>
            </div>
          )}
        </div>
      )}

      {/* Slide-up animation + onboarding animations */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes sliderPulse {
          0%, 100% { width: 45%; }
          50% { width: 55%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
