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

const STAGE_MAP: Record<string, { label: string; detail: string; story: string[] }> = {
  classifying: {
    label: "Understanding your question",
    detail: "Analyzing intent and complexity",
    story: [
      "Reading between the lines...",
      "Figuring out what kind of tool you need",
      "Choosing from 40+ live APIs",
    ],
  },
  generating: {
    label: "Crafting your interactive tool",
    detail: "Generating a custom Worker module",
    story: [
      "Writing the code for your tool...",
      "Adding sliders, inputs, and charts",
      "Making it interactive and responsive",
      "Wiring up live data connections",
    ],
  },
  validating: {
    label: "Checking code safety",
    detail: "Validating structure and scanning for issues",
    story: [
      "Scanning for security issues...",
      "Ensuring the code is sandboxed",
    ],
  },
  executing: {
    label: "Running in V8 sandbox",
    detail: "Fetching live data and building the page",
    story: [
      "Spinning up an isolated environment...",
      "Fetching live data from APIs",
      "Rendering your interactive tool",
    ],
  },
  retrying: {
    label: "Fixing and retrying",
    detail: "First attempt had an issue, regenerating",
    story: [
      "Something didn't look right...",
      "Adjusting and regenerating",
    ],
  },
};

const STAGE_ORDER = ["classifying", "generating", "validating", "executing"];

function BuildingPipeline({ currentStage, onBackground, query }: { currentStage: string | null; onBackground?: () => void; query?: string }) {
  const [elapsed, setElapsed] = useState(0);
  const [showNotifyBtn, setShowNotifyBtn] = useState(false);
  const [revealedLines, setRevealedLines] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const prevStageRef = useRef<string | null>(null);

  // Narrative lines for each stage — revealed sequentially, never repeated
  const NARRATIVE: Record<string, { lines: string[]; caps?: string[] }> = {
    classifying: {
      lines: [
        "Reading your question...",
        "Deciding what kind of tool to build",
      ],
      caps: ["intent analysis", "complexity scoring"],
    },
    generating: {
      lines: [
        "Writing custom code for this",
        "Adding interactive controls",
        "Connecting to live data sources",
      ],
      caps: ["sliders & inputs", "charts & tables", "live API calls", "responsive layout"],
    },
    validating: {
      lines: [
        "Checking the code is safe to run",
      ],
      caps: ["sandbox security", "injection scan"],
    },
    executing: {
      lines: [
        "Spinning up an isolated V8 environment",
        "Fetching live data...",
        "Almost there",
      ],
      caps: ["isolated runtime", "network fetch"],
    },
    retrying: {
      lines: [
        "First attempt had an issue",
        "Regenerating a better version",
      ],
    },
  };

  // When stage changes, queue up the new narrative lines one by one
  useEffect(() => {
    if (!currentStage || currentStage === prevStageRef.current) return;
    prevStageRef.current = currentStage;

    const stageNarrative = NARRATIVE[currentStage];
    if (!stageNarrative) return;

    // Reveal lines with staggered delay
    stageNarrative.lines.forEach((line, i) => {
      setTimeout(() => {
        setRevealedLines(prev => [...prev, line]);
      }, i * 2000);
    });

    // Reveal capability pills with stagger
    if (stageNarrative.caps) {
      stageNarrative.caps.forEach((cap, i) => {
        setTimeout(() => {
          setCapabilities(prev => prev.includes(cap) ? prev : [...prev, cap]);
        }, 800 + i * 600);
      });
    }
  }, [currentStage]);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowNotifyBtn(true), 15000);
    return () => clearTimeout(t);
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${s}s`;
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md mx-auto">

        {/* User's query — anchored at top */}
        {query && (
          <div className="text-center mb-8" style={{ animation: 'fadeIn 0.6s ease' }}>
            <div className="text-xs uppercase tracking-widest text-[var(--color-ink-muted)] mb-2 font-semibold">Building a tool for</div>
            <div className="text-lg font-semibold text-[var(--color-ink)] leading-snug">"{query}"</div>
          </div>
        )}

        {/* Narrative — lines appear one by one, Kimi-style */}
        <div className="space-y-3 mb-8 min-h-[120px]">
          {revealedLines.map((line, i) => {
            const isLatest = i === revealedLines.length - 1;
            return (
              <div
                key={line + i}
                className={`flex items-start gap-3 transition-opacity duration-500 ${isLatest ? "opacity-100" : "opacity-40"}`}
                style={{ animation: 'narrativeReveal 0.6s cubic-bezier(0.22,1,0.36,1)' }}
              >
                {isLatest ? (
                  <div className="mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 glow-pulse" style={{ background: 'var(--color-ember)' }} />
                ) : (
                  <div className="mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[#166534]" />
                )}
                <span className={`text-lg ${isLatest ? "text-[var(--color-ink)] font-medium" : "text-[var(--color-ink-muted)]"}`}>
                  {line}
                </span>
              </div>
            );
          })}
        </div>

        {/* Capability pills — fly in one by one like Kimi agent badges */}
        {capabilities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {capabilities.map((cap) => (
              <span
                key={cap}
                className="px-3 py-1.5 text-xs font-semibold rounded-full border"
                style={{
                  background: 'var(--color-surface-raised)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-ink-secondary)',
                  animation: 'pillReveal 0.4s cubic-bezier(0.22,1,0.36,1)',
                }}
              >
                {cap}
              </span>
            ))}
          </div>
        )}

        {/* Minimal progress — timer + thin bar */}
        <div className="text-center mb-4">
          <span className="forge-timer text-sm" style={{ color: 'var(--color-ember)' }}>{formatTime(elapsed)}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden bg-[rgba(194,65,12,0.08)]">
          <div
            className="h-full rounded-full"
            style={{
              width: '100%',
              background: 'linear-gradient(90deg, var(--color-ember), var(--color-ember-deep))',
              animation: 'progressPulse 2s ease-in-out infinite',
            }}
          />
        </div>

        {/* Background button — appears after 15s */}
        {showNotifyBtn && onBackground && (
          <div className="mt-8 text-center" style={{ animation: 'fadeIn 0.5s ease' }}>
            <button
              type="button"
              onClick={onBackground}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ember)] border border-[#D6D3D1] hover:border-[var(--color-ember)] rounded-xl transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              Go back — I'll check later
            </button>
          </div>
        )}
      </div>
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
    <div className="app-shell">
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
            <div className="text-center mb-14">
              {/* The mark */}
              <div className="mb-8">
                <h1 className="display text-6xl md:text-8xl" style={{ fontFamily: "var(--font-display)" }}>
                  <em>Yukti</em>
                </h1>
              </div>

              {/* The proposition */}
              <h2 className="text-xl md:text-2xl font-medium text-[var(--color-ink-secondary)] max-w-md mx-auto leading-relaxed">
                Ask anything. Get a tool<br/>that answers back.
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="mb-16">
              <div className="relative">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                  placeholder="How much tax on a 12 lakh salary?"
                  rows={2}
                  className="query-input pr-14"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!query.trim()}
                  className="absolute right-3 bottom-3 w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-[0.92] disabled:opacity-20 disabled:cursor-not-allowed"
                  style={{
                    background: query.trim() ? 'linear-gradient(135deg, var(--color-ember), var(--color-ember-deep))' : '#E5E3DF',
                    boxShadow: query.trim() ? '0 2px 8px var(--color-ember-glow)' : 'none',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 14V4M9 4L4 9M9 4L14 9" stroke={query.trim() ? "white" : "#A8A29E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </form>

            {/* Clarification UI */}
            {clarifying && (
              <div className="text-center py-6 text-sm text-[#78716C]">Analyzing your question...</div>
            )}

            {showClarification && (
              <div className="mb-8 bg-white border-[1.5px] border-[#E7E5E4] rounded-xl p-5">
                <div className="mono-label mb-4">
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
                    Build
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {EXAMPLE_CATEGORIES.map((cat) => (
                <div key={cat.label} className="example-card group" data-category={cat.label.toLowerCase().replace(/\s.*/, "")}>
                  <div className="mono-label mb-4" style={{ color: cat.color }}>
                    {cat.label}
                  </div>
                  <div className="flex flex-col gap-3">
                    {cat.queries.map((q) => (
                      <button
                        type="button"
                        key={q}
                        onClick={() => { setQuery(q); submitQuery(q); }}
                        className="text-left text-[15px] font-medium text-[var(--color-ink)] leading-snug transition-all group-hover:text-[var(--color-ink-secondary)] hover:!text-[var(--color-ember)] hover:translate-x-1"
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
                <div className="mono-label mb-3">My Tools</div>
                <div className="flex flex-col gap-2">
                  {myTools.map((tool) => (
                    <div
                      key={tool.runId}
                      className="flex items-center gap-3 bg-white border-[1.5px] border-[#E7E5E4] rounded-lg px-4 py-3 hover:border-[var(--color-ember)] hover:shadow-[0_0_12px_var(--color-ember-glow)] transition-all group"
                      style={{ borderLeft: '3px solid var(--color-ember)' }}
                    >
                      <button
                        type="button"
                        onClick={() => handleLoadTool(tool)}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm font-semibold text-[var(--color-ink)] leading-snug">{tool.query}</div>
                        <div className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                          {new Date(tool.savedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          {" · "}
                          {tool.model.split("/").pop()}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setQuery(tool.query); generate(tool.query); }}
                        className="text-[var(--color-ink-muted)] hover:text-[var(--color-ember)] transition-colors text-xs md:opacity-0 md:group-hover:opacity-100"
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
                          btn.className = "text-[var(--color-ember)] bg-[#FFF7ED] rounded px-1 transition-colors text-xs";
                          setTimeout(() => { btn.textContent = "Share"; btn.className = "text-[var(--color-ink-muted)] hover:text-[var(--color-ember)] transition-colors text-xs md:opacity-0 md:group-hover:opacity-100"; }, 2000);
                        }}
                        className="text-[var(--color-ink-muted)] hover:text-[var(--color-ember)] transition-colors text-xs md:opacity-0 md:group-hover:opacity-100"
                        title="Copy share link"
                      >
                        Share
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTool(tool.runId)}
                        className="text-[var(--color-ink-muted)] hover:text-[#DC2626] transition-colors text-xs md:opacity-0 md:group-hover:opacity-100"
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
          <div className="sidebar hidden md:flex md:w-[380px] md:min-w-[380px] flex-col h-screen">
            <div className="px-5 py-5 border-b border-[#E5E3DF] text-center">
              <h1
                onClick={resetToHome}
                className="display text-3xl cursor-pointer hover:text-[var(--color-ember)] transition-colors"
                style={{ fontFamily: "var(--font-display)" }}
              ><em>Yukti</em></h1>
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
                  {loading ? "Forging..." : "Build"}
                </button>
              </form>

              {/* Saved tools in sidebar */}
              {myTools.length > 0 && (
                <div>
                  <div className="mono-label mb-2">Recent tools</div>
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
                    {runId && <div className="mt-1 text-[10px] font-mono text-[var(--color-ink-muted)]">Run: {runId}</div>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile header — compact, with back arrow */}
          <div className="md:hidden sticky top-0 z-50 border-b border-[#E7E5E4] bg-white/95 backdrop-blur-sm">
            <div className="flex items-center px-3 py-2.5">
              <button type="button" onClick={resetToHome} className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#78716C] hover:text-[#1C1917] transition-colors">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <div className="flex-1 text-center">
                <span className="display text-lg" style={{ fontFamily: "var(--font-display)" }}><em>Yukti</em></span>
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
            {loading && !refining && <BuildingPipeline currentStage={streamStage} onBackground={handleBackground} query={query} />}
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
              <div className="tool-reveal">
                <div className="tool-stage-wrapper">
                  <div className="tool-stage">
                    <div className="tool-stage__chrome">
                      <span className="tool-stage__dot" />
                      <span className="tool-stage__dot" />
                      <span className="tool-stage__dot" />
                      <div className="tool-stage__label">
                        <span className="tool-stage__label-pill">Live</span>
                        <span className="tool-stage__label-text">Interactive workspace</span>
                      </div>
                    </div>
                    <iframe
                      ref={iframeRef}
                      srcDoc={html}
                      className="tool-stage__frame"
                      sandbox="allow-scripts"
                      title="Interactive Tool"
                    />
                  </div>
                </div>
                {/* Inspector + Refine bar (desktop only) */}
                {code && (
                  <div className="hidden md:block border-t-2 border-[#D6D0C4]">
                    {/* Inspector + Refresh bar */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#EDE8DF]">
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
                                  : "text-[#78716C] hover:text-[var(--color-ink-muted)]"
                              }`}
                            >
                              {tab === "meta" ? "Meta" : tab === "output" ? "Output" : tab === "code" ? "Code" : "Capabilities"}
                            </button>
                          ))}
                        </div>

                        {/* Tab: Meta */}
                        {inspectorTab === "meta" && (
                          <div className="px-4 py-3 text-xs space-y-1.5">
                            <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Run ID</span><span className="font-mono">{runId}</span></div>
                            <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Model</span><span>{meta?.model?.split("/").pop()}</span></div>
                            {meta?.tier && (
                              <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Tier</span><span className="px-1.5 py-0.5 bg-[#44403C] rounded text-[10px] font-medium">{meta.tier}</span></div>
                            )}
                            {meta?.queryType && (
                              <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Query Type</span><span className="px-1.5 py-0.5 bg-[#3B2F2F] rounded text-[10px] font-medium text-[#FBBF24]">{meta.queryType}</span></div>
                            )}
                            {meta?.promptVersion && (
                              <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Prompt Version</span><span className="font-mono">{meta.promptVersion}</span></div>
                            )}
                            {meta?.timing && (
                              <>
                                <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">LLM Time</span><span>{(meta.timing.llmMs / 1000).toFixed(1)}s</span></div>
                                <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Sandbox Time</span><span>{(meta.timing.execMs / 1000).toFixed(1)}s</span></div>
                                {meta.retried && <div className="flex justify-between text-[#FBBF24]"><span>Retried</span><span>Yes</span></div>}
                                <div className="flex justify-between font-medium"><span className="text-[var(--color-ink-muted)]">Total</span><span>{(meta.timing.totalMs / 1000).toFixed(1)}s</span></div>
                              </>
                            )}
                            {meta?.domainsFetched && meta.domainsFetched.length > 0 && (
                              <div className="flex justify-between items-start">
                                <span className="text-[var(--color-ink-muted)]">Domains Fetched</span>
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
                                <span className="text-[var(--color-ink-muted)]">Capabilities</span>
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
                                          <span className="text-[10px] text-[var(--color-ink-muted)]">{ds.live ? "live" : "static"}</span>
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
                                        <div className="text-[10px] text-[var(--color-ink-muted)]">{meta.toolMeta.computedValues.primaryMetric.label}</div>
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
                                            <div className="text-[10px] text-[var(--color-ink-muted)]">{m.label}</div>
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
                                      <div className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">{desc}</div>
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
                    <div className="bg-[#EDE8DF] px-4 py-3 border-t border-[#D6D0C4]">
                      <div className="max-w-2xl mx-auto flex gap-2">
                        <input
                          type="text"
                          value={refineInput}
                          onChange={(e) => setRefineInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleRefine(); } }}
                          placeholder="Refine: add a column, change currency, make chart bigger..."
                          className="flex-1 px-4 py-2.5 text-sm bg-white border-[1.5px] border-[#D6D3D1] rounded-lg outline-none placeholder:text-[var(--color-ink-muted)] focus:border-[#C2410C]"
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
              </div>
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
              className="w-full px-4 py-3 text-sm bg-[#FAFAF8] border-[1.5px] border-[#D6D3D1] rounded-xl outline-none placeholder:text-[var(--color-ink-muted)] focus:border-[#C2410C]"
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
                        : "text-[#78716C] hover:text-[var(--color-ink-muted)]"
                    }`}
                  >
                    {tab === "meta" ? "Meta" : tab === "output" ? "Output" : tab === "code" ? "Code" : "Capabilities"}
                  </button>
                ))}
              </div>
            </div>

            {inspectorTab === "meta" && (
              <div className="px-4 py-3 text-xs space-y-1.5">
                <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Run ID</span><span className="font-mono text-[11px]">{runId}</span></div>
                <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Model</span><span>{meta?.model?.split("/").pop()}</span></div>
                {meta?.tier && <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Tier</span><span className="px-1.5 py-0.5 bg-[#44403C] rounded text-[10px] font-medium">{meta.tier}</span></div>}
                {meta?.queryType && <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Query Type</span><span className="px-1.5 py-0.5 bg-[#3B2F2F] rounded text-[10px] font-medium text-[#FBBF24]">{meta.queryType}</span></div>}
                {meta?.timing && (
                  <>
                    <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">LLM Time</span><span>{(meta.timing.llmMs / 1000).toFixed(1)}s</span></div>
                    <div className="flex justify-between"><span className="text-[var(--color-ink-muted)]">Sandbox Time</span><span>{(meta.timing.execMs / 1000).toFixed(1)}s</span></div>
                    <div className="flex justify-between font-medium"><span className="text-[var(--color-ink-muted)]">Total</span><span>{(meta.timing.totalMs / 1000).toFixed(1)}s</span></div>
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
                              <span className="text-[10px] text-[var(--color-ink-muted)]">{ds.live ? "live" : "static"}</span>
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
                          <div className="text-[10px] text-[var(--color-ink-muted)]">{meta.toolMeta.computedValues.primaryMetric.label}</div>
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
                          <div className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">{desc}</div>
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

      {/* Onboarding overlay for first-time visitors — single screen */}
      {showOnboarding && (
        <div className="onboarding fixed inset-0 z-[200] flex flex-col items-center justify-center">
          <div className="w-full max-w-2xl px-6 animate-[fadeIn_0.8s_ease]">
            {/* Yukti branding */}
            <div className="text-center mb-6">
              <h2 className="display text-4xl md:text-5xl" style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
                <em>Yukti</em>
              </h2>
            </div>

            {/* Headline */}
            <div className="text-center mb-10">
              <h1 className="display text-5xl md:text-7xl leading-tight mb-4"
                  style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}>
                <em>Every question deserves<br/>more than words.</em>
              </h1>
              <p className="text-xl text-[var(--color-ink-secondary)] max-w-md mx-auto">
                Ask anything. Get a live, interactive tool — not a chatbot answer.
              </p>
            </div>

            {/* Demo mockup — question -> tool */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mb-10">
              {/* Question card */}
              <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-sm">
                <div className="text-sm font-semibold uppercase tracking-wider text-[var(--color-ink-muted)] mb-3">You ask</div>
                <p className="text-xl font-medium text-[var(--color-ink)]">"I earn 12L, how much tax?"</p>
              </div>

              {/* Tool mockup card */}
              <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-sm">
                <div className="text-sm font-semibold uppercase tracking-wider text-[var(--color-ember)] mb-3">You get</div>
                <div className="space-y-3">
                  <div className="bg-[#FFF7ED] rounded-xl p-4 text-center border border-[#FDBA74]">
                    <div className="text-sm uppercase tracking-wider text-[var(--color-ink-muted)] mb-1">Total Tax</div>
                    <div className="text-3xl font-bold text-[var(--color-ink)]">&#8377;1,17,000</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#FAFAF8] rounded-lg p-3 text-center border border-[#E7E5E4]">
                      <div className="text-xs uppercase text-[var(--color-ink-muted)] mb-0.5">Effective Rate</div>
                      <div className="text-lg font-semibold text-[var(--color-ink)]">9.8%</div>
                    </div>
                    <div className="bg-[#FAFAF8] rounded-lg p-3 text-center border border-[#E7E5E4]">
                      <div className="text-xs uppercase text-[var(--color-ink-muted)] mb-0.5">Monthly</div>
                      <div className="text-lg font-semibold text-[var(--color-ink)]">&#8377;9,750</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Single CTA — go straight to the app */}
            <div className="text-center">
              <p className="text-base text-[var(--color-ink-secondary)] mb-6">
                Custom-built in seconds using AI + secure sandboxing
              </p>
              <button onClick={() => { localStorage.setItem("yukti-onboarded", "1"); setShowOnboarding(false); }}
                      className="px-10 py-4 text-lg font-semibold rounded-2xl transition-all active:scale-[0.98]"
                      style={{
                        background: 'linear-gradient(135deg, var(--color-ember), var(--color-ember-deep))',
                        color: 'white',
                        boxShadow: '0 4px 20px var(--color-ember-glow)',
                      }}>
                Try it yourself &rarr;
              </button>
            </div>
          </div>
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
        @keyframes narrativeReveal {
          0% { opacity: 0; transform: translateX(-12px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes pillReveal {
          0% { opacity: 0; transform: scale(0.8) translateY(4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes progressPulse {
          0% { opacity: 0.4; transform: scaleX(0.3); transform-origin: left; }
          50% { opacity: 1; transform: scaleX(0.7); transform-origin: left; }
          100% { opacity: 0.4; transform: scaleX(0.3); transform-origin: left; }
        }
      `}</style>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
