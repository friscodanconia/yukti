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

const BUILD_PHASES = [
  { label: "Understanding your question", detail: "Analyzing intent and complexity", duration: 2000 },
  { label: "Selecting data sources", detail: "Choosing the right APIs", duration: 2500 },
  { label: "Writing the code", detail: "Generating a custom Worker module", duration: 15000 },
  { label: "Securing the sandbox", detail: "Setting capabilities and network policy", duration: 1500 },
  { label: "Executing in isolate", detail: "Running in Cloudflare V8 sandbox", duration: 2000 },
];

function BuildingPipeline() {
  const [phase, setPhase] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let current = 0;
    function next() {
      if (current < BUILD_PHASES.length - 1) {
        current++;
        setPhase(current);
        setTimeout(next, BUILD_PHASES[current].duration);
      }
    }
    const t = setTimeout(next, BUILD_PHASES[0].duration);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Live elapsed */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F4F4F5] rounded-full">
            <div className="w-2 h-2 rounded-full bg-[#C2410C] animate-pulse" />
            <span className="text-xs font-medium text-[#3F3F46]">Building</span>
            <span className="text-xs font-mono text-[#A1A1AA]">{elapsed}s</span>
          </div>
        </div>

        {/* Phase list */}
        <div className="space-y-1">
          {BUILD_PHASES.map((p, i) => {
            const status = i < phase ? "done" : i === phase ? "active" : "waiting";
            return (
              <div
                key={p.label}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                  status === "active" ? "bg-[#F4F4F5]" : ""
                }`}
              >
                {/* Status indicator */}
                <div className="mt-0.5 flex-shrink-0">
                  {status === "done" ? (
                    <div className="w-5 h-5 rounded-full bg-[#18181B] flex items-center justify-center">
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
                    status === "done" ? "text-[#09090B]" :
                    status === "active" ? "text-[#09090B]" :
                    "text-[#D4D4D8]"
                  }`}>
                    {p.label}
                  </div>
                  {status === "active" && (
                    <div className="text-xs text-[#A1A1AA] mt-0.5 animate-[fadeIn_0.2s_ease]">
                      {p.detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-6 h-1 bg-[#F4F4F5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#18181B] rounded-full transition-all duration-700 ease-out"
            style={{ width: `${((phase + 1) / BUILD_PHASES.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
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
  } | null>(null);
  const [showInspector, setShowInspector] = useState(false);
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleSave = () => {
    if (!runId || !toolUrl) return;
    saveTool({
      runId,
      query: query,
      toolUrl,
      model: meta?.model || "",
      savedAt: new Date().toISOString(),
    });
    setSaved(true);
    setMyTools(getSavedTools());
  };

  const handleRemoveTool = (id: string) => {
    removeTool(id);
    setMyTools(getSavedTools());
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
    setHtml(null);
    setCode(null);
    setRunId(null);
    setToolUrl(null);
    setMeta(null);
    setError(null);
    setShowDetails(false);
    setCopied(false);
    setSaved(false);
    setRefineInput("");
    setRefining(false);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const text = await res.text();
      console.log("[Yukti] Response length:", text.length, "status:", res.status);
      if (!text) {
        setError("Empty response from server");
        return;
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("[Yukti] Failed to parse:", text.slice(0, 500));
        setError("Server returned invalid response");
        return;
      }
      console.log("[Yukti] ok:", data.ok, "html_len:", data.html?.length, "error:", data.error);
      if (data.ok && data.html) {
        setHtml(data.html);
        setCode(data.code || null);
        setRunId(data.runId);
        setToolUrl(data.toolUrl);
        setMeta(data.meta);
      } else {
        setError(data.error || "Generation failed — no HTML returned");
      }
    } catch (err) {
      console.error("[Yukti] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const submitQuery = async (topic: string) => {
    if (!topic.trim()) return;
    // Reset clarification state
    setClarifying(true);
    setClarifyQuestions(null);
    setClarifyAnswers({});
    setClarifyCustomInputs({});

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

  const hasResult = !!(html || loading || error || runId);
  const showClarification = !!(clarifyQuestions && clarifyQuestions.length > 0);

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Start screen — centered, no split */}
      {!hasResult && (
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
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.origin + tool.toolUrl);
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
      {hasResult && (
        <div className="h-screen flex flex-col md:flex-row">
          {/* Left panel — query (hidden on mobile) */}
          <div className="hidden md:flex md:w-[380px] md:min-w-[380px] bg-[#F0EDE8] border-r border-[#E5E3DF] flex-col h-screen">
            <div className="px-5 py-5 border-b border-[#E5E3DF] text-center">
              <h1
                onClick={() => { setHtml(null); setCode(null); setMeta(null); setError(null); setRunId(null); setToolUrl(null); setQuery(""); setShowDetails(false); setRefineInput(""); setRefining(false); }}
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
                      className="flex-1 py-2 text-xs font-medium rounded-lg border border-[#D6D3D1] hover:border-[#C2410C] hover:text-[#C2410C] transition-all"
                    >
                      {copied ? "Copied" : "Share"}
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

          {/* Mobile header — always visible on mobile in result view */}
          <div className="md:hidden sticky top-0 z-50 border-b border-[#E7E5E4] bg-white">
            <div className="text-center py-3">
              <button
                type="button"
                onClick={() => { setHtml(null); setCode(null); setMeta(null); setError(null); setRunId(null); setToolUrl(null); setQuery(""); setShowDetails(false); setRefineInput(""); setRefining(false); }}
                className="text-2xl font-bold tracking-tight text-[#1C1917]"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "-0.03em" }}
              >
                Yukti
              </button>
            </div>
            {toolUrl && (
              <div className="flex gap-2 px-4 pb-3 justify-center">
                <button type="button" onClick={handleSave} className={`px-4 py-1.5 text-sm font-medium rounded-lg ${saved ? "bg-[#F0FDF4] border border-[#86EFAC] text-[#166534]" : "bg-[#C2410C] text-white"}`}>
                  {saved ? "Saved" : "Save"}
                </button>
                <button type="button" onClick={() => { navigator.clipboard.writeText(window.location.origin + toolUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="px-4 py-1.5 text-sm font-medium border-[1.5px] border-[#D6D3D1] rounded-lg">
                  {copied ? "Copied" : "Share"}
                </button>
              </div>
            )}
          </div>

          {/* Right panel — output */}
          <div className="flex-1 bg-white flex flex-col min-h-[50vh] md:h-screen">
            {loading && !refining && <BuildingPipeline />}
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
                  className="flex-1 w-full border-none"
                  sandbox="allow-scripts"
                  title="Interactive Tool"
                />
                {/* Inspector + Refine bar */}
                {code && (
                  <div className="border-t border-[#E7E5E4]">
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
                        {/* Meta info */}
                        <div className="px-4 py-3 border-b border-[#44403C] text-xs space-y-1.5">
                          <div className="flex justify-between"><span className="text-[#A8A29E]">Run ID</span><span className="font-mono">{runId}</span></div>
                          <div className="flex justify-between"><span className="text-[#A8A29E]">Model</span><span>{meta?.model?.split("/").pop()}</span></div>
                          {meta?.timing && (
                            <>
                              <div className="flex justify-between"><span className="text-[#A8A29E]">LLM Time</span><span>{(meta.timing.llmMs / 1000).toFixed(1)}s</span></div>
                              <div className="flex justify-between"><span className="text-[#A8A29E]">Sandbox Time</span><span>{(meta.timing.execMs / 1000).toFixed(1)}s</span></div>
                              {meta.retried && <div className="flex justify-between text-[#FBBF24]"><span>Retried</span><span>Yes</span></div>}
                              <div className="flex justify-between font-medium"><span className="text-[#A8A29E]">Total</span><span>{(meta.timing.totalMs / 1000).toFixed(1)}s</span></div>
                            </>
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
                        {/* Generated code */}
                        <div className="px-4 py-2">
                          <div className="text-[10px] uppercase tracking-wider text-[#78716C] mb-1">Generated Worker Code</div>
                          <pre className="text-[11px] leading-relaxed font-mono text-[#D6D3D1] whitespace-pre-wrap break-all">{code}</pre>
                        </div>
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
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
