/**
 * LLM Router — uses OpenRouter as a unified gateway.
 * Picks the best model based on query complexity and type.
 * Abstracts away model choice from the user entirely.
 */

// ── Scope Classifier — fast, no-LLM check for tool-worthiness ──

export interface ToolWorthiness {
  worthy: boolean;
  reason?: string;
  suggestion?: string;
}

const GREETING_PATTERNS = [
  /^(hi|hello|hey|yo|sup|hola|namaste|howdy|hiya|greetings|good\s*(morning|evening|afternoon|night))[\s!.?]*$/i,
];

const CHITCHAT_PATTERNS = [
  /^(thanks|thank\s*you|thx|ty|bye|goodbye|see\s*ya|later|ok|okay|cool|nice|great|awesome|lol|haha|hmm+|yes|no|sure|nope|yep|yeah)[\s!.?]*$/i,
  /^how\s+are\s+you/i,
  /^what'?s?\s+up/i,
  /^good\s+(morning|evening|afternoon|night)/i,
];

const META_PATTERNS = [
  /^(who\s+(made|built|created|are)\s+you)/i,
  /^(what\s+(can\s+you\s+do|are\s+you))/i,
  /^help[\s!.?]*$/i,
  /^(about|info|version)[\s!.?]*$/i,
];

const OPINION_PATTERNS = [
  /^(what'?s?\s+the\s+meaning\s+of\s+life)/i,
  /^(do\s+you\s+(like|love|hate|feel|think))/i,
  /^(are\s+you\s+(sentient|alive|real|human|conscious))/i,
  /^(tell\s+me\s+a\s+joke)/i,
  /^(sing|tell\s+me\s+a\s+(story|poem|riddle))/i,
];

const TOOL_SIGNAL_PATTERNS = [
  /\d+[\s]*(%|rs|inr|usd|eur|gbp|rupee|dollar|pound|lakh|crore|cr|lac|k\b|l\b)/i,
  /\b(how\s+much|how\s+many|calculate|compute|convert)\b/i,
  /\b(compare|versus|\bvs\b|difference\s+between)\b/i,
  /\b(recipe|make|cook|bake|exercise|workout|yoga)\b/i,
  /\b(stock|price|weather|earthquake|crypto|bitcoin|ethereum|nifty|sensex)\b/i,
  /\b(tax|emi|sip|loan|salary|invest|budget|rent\s+vs|compound)\b/i,
  /\b(calories|protein|nutrition|bmi|diet)\b/i,
  /\b(simulate|probability|monte\s+carlo|forecast)\b/i,
  /\d+\s*(x|\*|\/|\+|\-)\s*\d+/,  // arithmetic expressions
];

const SINGLE_WORD_SUGGESTIONS: Record<string, string> = {
  bitcoin: "Try: 'Bitcoin price trend this month' or 'Bitcoin vs Ethereum comparison'",
  crypto: "Try: 'Top 10 crypto prices today' or 'How much is 1 BTC in INR?'",
  weather: "Try: 'Weather in Bangalore today' or 'Will it rain in Mumbai this week?'",
  tax: "Try: 'How much tax do I pay on 12L salary?' or 'New vs old tax regime comparison'",
  stocks: "Try: 'How did Reliance stock do this month?' or 'Nifty 50 performance today'",
  stock: "Try: 'How did Apple stock do this month?' or 'Compare TCS vs Infosys stock'",
  money: "Try: 'How much tax do I pay on 12L?' or 'SIP of 10K/month for 20 years'",
  loan: "Try: 'EMI on 50L home loan at 8.5%' or 'Should I prepay my loan or invest?'",
  food: "Try: 'How do I make butter chicken?' or 'High-protein vegetarian meals'",
  health: "Try: 'Best exercises for lower back pain' or 'How much protein do I need daily?'",
  exercise: "Try: 'Best exercises for lower back pain' or '30-minute home workout plan'",
  gold: "Try: 'Gold price trend in India this year' or 'Gold vs Nifty returns over 10 years'",
  earthquake: "Try: 'Any earthquakes in the last 24 hours?' or 'Recent earthquakes near Japan'",
};

export function isToolWorthy(query: string): ToolWorthiness {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();
  const words = trimmed.split(/\s+/).filter(Boolean);

  // Empty or near-empty
  if (words.length === 0) {
    return {
      worthy: false,
      reason: "Looks like an empty query. Yukti builds interactive tools from questions.",
      suggestion: "How much tax do I pay on 12L?\nBitcoin vs Ethereum — which grew more?\nBest exercises for lower back pain",
    };
  }

  // Greetings
  for (const pat of GREETING_PATTERNS) {
    if (pat.test(trimmed)) {
      return {
        worthy: false,
        reason: "Hey! Yukti is best at building interactive tools — calculators, comparisons, live data dashboards, and more.",
        suggestion: "I earn 12L, how much tax do I pay?\nRent vs buy a flat in Bangalore\nAny earthquakes in the last 24 hours?",
      };
    }
  }

  // Chitchat
  for (const pat of CHITCHAT_PATTERNS) {
    if (pat.test(trimmed)) {
      return {
        worthy: false,
        reason: "Yukti doesn't do chitchat — it builds interactive tools from real questions.",
        suggestion: "$500/month invested for 20 years — what do I get?\nHow do I make butter chicken?\nHow did Apple stock do this month?",
      };
    }
  }

  // Meta / system queries
  for (const pat of META_PATTERNS) {
    if (pat.test(trimmed)) {
      return {
        worthy: false,
        reason: "Yukti turns your questions into interactive tools with live data, sliders, charts, and calculations. Just ask something specific!",
        suggestion: "Should I prepay my home loan or invest in SIPs?\nHow much protein do I need daily?\nCompare iPhone 16 vs Samsung S25",
      };
    }
  }

  // Opinion / subjective / jokes
  for (const pat of OPINION_PATTERNS) {
    if (pat.test(trimmed)) {
      return {
        worthy: false,
        reason: "That's more of a philosophical question. Yukti works best with questions that have concrete, interactive answers.",
        suggestion: "What if I invest 10K/month for 30 years?\nMBA vs job — what pays more over 10 years?\nShow me today's NASA space photo",
      };
    }
  }

  // Strong tool signals — always worthy
  for (const pat of TOOL_SIGNAL_PATTERNS) {
    if (pat.test(trimmed)) {
      return { worthy: true };
    }
  }

  // Long queries (> 8 words) — usually have enough context
  if (words.length > 8) {
    return { worthy: true };
  }

  // Single-word queries — check for known topics that need refinement
  if (words.length === 1) {
    const suggestion = SINGLE_WORD_SUGGESTIONS[lower];
    if (suggestion) {
      return { worthy: true, suggestion };
    }
    // Unknown single word — not tool-worthy
    return {
      worthy: false,
      reason: `"${trimmed}" is a bit vague for building a tool. Try adding more detail about what you'd like to explore.`,
      suggestion: "How much tax do I pay on 12L?\nBitcoin price trend this month\nBest exercises for lower back pain",
    };
  }

  // 2-3 word queries that didn't match any pattern — borderline
  if (words.length <= 3) {
    // Check if any word matches a known topic
    for (const word of words) {
      if (SINGLE_WORD_SUGGESTIONS[word]) {
        return { worthy: true, suggestion: SINGLE_WORD_SUGGESTIONS[word] };
      }
    }
    // Very short, no signals — likely too vague
    return {
      worthy: false,
      reason: `"${trimmed}" is a bit vague. Try being more specific about what you'd like to calculate, compare, or explore.`,
      suggestion: "I earn 12L, how much tax do I pay?\nRent vs buy a flat in Bangalore\nHow do I make butter chicken?",
    };
  }

  // 4-8 words with no strong signal — let it through (conservative)
  return { worthy: true };
}

export type ModelTier = "fast" | "standard" | "powerful";

export type QueryType = "tool" | "delight" | "live-data" | "comparison" | "lookup";

export interface ModelConfig {
  id: string;
  label: string;
}

export interface QueryClassification {
  tier: ModelTier;
  queryType: QueryType;
}

const MODELS: Record<ModelTier, ModelConfig> = {
  fast: {
    id: "anthropic/claude-haiku-4-5",
    label: "Claude Haiku 4.5",
  },
  standard: {
    id: "anthropic/claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
  },
  powerful: {
    id: "anthropic/claude-opus-4-6",
    label: "Claude Opus 4.6",
  },
};

// --- Weighted signal definitions ---

interface Signal {
  pattern: string;
  tierWeight: Partial<Record<ModelTier, number>>;
  typeWeight: Partial<Record<QueryType, number>>;
}

const SIGNALS: Signal[] = [
  // Tool signals — calculators, planners, simulators
  { pattern: "simulate",          tierWeight: { powerful: 3 },  typeWeight: { tool: 3 } },
  { pattern: "simulation",        tierWeight: { powerful: 3 },  typeWeight: { tool: 3 } },
  { pattern: "monte carlo",       tierWeight: { powerful: 3 },  typeWeight: { tool: 3 } },
  { pattern: "cellular",          tierWeight: { powerful: 2 },  typeWeight: { tool: 2 } },
  { pattern: "system dynamics",   tierWeight: { powerful: 3 },  typeWeight: { tool: 2 } },
  { pattern: "feedback loop",     tierWeight: { powerful: 2 },  typeWeight: { tool: 2 } },
  { pattern: "multiple variables",tierWeight: { powerful: 2 },  typeWeight: { tool: 2 } },
  { pattern: "interaction between",tierWeight: { powerful: 2 }, typeWeight: { tool: 2 } },
  { pattern: "over time",         tierWeight: { powerful: 2 },  typeWeight: { tool: 2 } },
  { pattern: "compound",          tierWeight: { standard: 2 },  typeWeight: { tool: 2 } },
  { pattern: "dynamically",       tierWeight: { powerful: 2 },  typeWeight: { tool: 2 } },
  { pattern: "probability",       tierWeight: { powerful: 2 },  typeWeight: { tool: 2 } },
  { pattern: "calculate",         tierWeight: { standard: 2 },  typeWeight: { tool: 3 } },
  { pattern: "calculator",        tierWeight: { standard: 2 },  typeWeight: { tool: 3 } },
  { pattern: "how much tax",      tierWeight: { standard: 2 },  typeWeight: { tool: 3 } },
  { pattern: "how much do i",     tierWeight: { standard: 2 },  typeWeight: { tool: 2 } },
  { pattern: "emi",               tierWeight: { standard: 2 },  typeWeight: { tool: 3 } },
  { pattern: "sip",               tierWeight: { standard: 2 },  typeWeight: { tool: 3 } },
  { pattern: "rent vs buy",       tierWeight: { standard: 3 },  typeWeight: { tool: 3 } },
  { pattern: "loan",              tierWeight: { standard: 2 },  typeWeight: { tool: 2 } },
  { pattern: "planner",           tierWeight: { standard: 2 },  typeWeight: { tool: 2 } },
  { pattern: "budget",            tierWeight: { standard: 2 },  typeWeight: { tool: 2 } },
  { pattern: "what if",           tierWeight: { standard: 2 },  typeWeight: { tool: 2 } },

  // Comparison signals
  { pattern: "compare",           tierWeight: { standard: 2 },  typeWeight: { comparison: 3 } },
  { pattern: "versus",            tierWeight: { standard: 2 },  typeWeight: { comparison: 3 } },
  { pattern: " vs ",              tierWeight: { standard: 2 },  typeWeight: { comparison: 3 } },
  { pattern: "difference between",tierWeight: { standard: 2 },  typeWeight: { comparison: 3 } },
  { pattern: "which is better",   tierWeight: { standard: 2 },  typeWeight: { comparison: 3 } },
  { pattern: "pros and cons",     tierWeight: { standard: 2 },  typeWeight: { comparison: 3 } },
  { pattern: "trade-off",         tierWeight: { standard: 2 },  typeWeight: { comparison: 2 } },
  { pattern: "tradeoff",          tierWeight: { standard: 2 },  typeWeight: { comparison: 2 } },
  { pattern: "should i",          tierWeight: { standard: 1 },  typeWeight: { comparison: 2 } },

  // Live-data signals
  { pattern: "current rate",      tierWeight: { standard: 2 },  typeWeight: { "live-data": 3 } },
  { pattern: "real data",         tierWeight: { standard: 2 },  typeWeight: { "live-data": 2 } },
  { pattern: "latest",            tierWeight: { standard: 1 },  typeWeight: { "live-data": 2 } },
  { pattern: "today",             tierWeight: { standard: 1 },  typeWeight: { "live-data": 2 } },
  { pattern: "stock",             tierWeight: { standard: 2 },  typeWeight: { "live-data": 3 } },
  { pattern: "share price",       tierWeight: { standard: 2 },  typeWeight: { "live-data": 3 } },
  { pattern: "weather",           tierWeight: { standard: 1 },  typeWeight: { "live-data": 3 } },
  { pattern: "earthquake",        tierWeight: { standard: 1 },  typeWeight: { "live-data": 3 } },
  { pattern: "crypto",            tierWeight: { standard: 1 },  typeWeight: { "live-data": 3 } },
  { pattern: "bitcoin",           tierWeight: { standard: 1 },  typeWeight: { "live-data": 3 } },
  { pattern: "ethereum",          tierWeight: { standard: 1 },  typeWeight: { "live-data": 3 } },
  { pattern: "score",             tierWeight: { standard: 1 },  typeWeight: { "live-data": 2 } },
  { pattern: "gold price",        tierWeight: { standard: 1 },  typeWeight: { "live-data": 3 } },
  { pattern: "exchange rate",     tierWeight: { standard: 1 },  typeWeight: { "live-data": 3 } },
  { pattern: "nifty",             tierWeight: { standard: 1 },  typeWeight: { "live-data": 3 } },
  { pattern: "sensex",            tierWeight: { standard: 1 },  typeWeight: { "live-data": 3 } },

  // Delight signals — recipes, explainers, guides
  { pattern: "how do i make",     tierWeight: { standard: 2 },  typeWeight: { delight: 3 } },
  { pattern: "how to make",       tierWeight: { standard: 2 },  typeWeight: { delight: 3 } },
  { pattern: "recipe",            tierWeight: { standard: 2 },  typeWeight: { delight: 3 } },
  { pattern: "cook",              tierWeight: { standard: 1 },  typeWeight: { delight: 2 } },
  { pattern: "explain",           tierWeight: { standard: 1 },  typeWeight: { delight: 2 } },
  { pattern: "how does",          tierWeight: { standard: 1 },  typeWeight: { delight: 2 } },
  { pattern: "best exercises",    tierWeight: { standard: 1 },  typeWeight: { delight: 2 } },
  { pattern: "workout",           tierWeight: { standard: 1 },  typeWeight: { delight: 2 } },
  { pattern: "guide to",          tierWeight: { standard: 1 },  typeWeight: { delight: 2 } },
  { pattern: "overview",          tierWeight: { standard: 1 },  typeWeight: { delight: 1 } },
  { pattern: "history of",        tierWeight: { standard: 1 },  typeWeight: { delight: 2 } },
  { pattern: "nutrition",         tierWeight: { standard: 1 },  typeWeight: { delight: 2 } },
  { pattern: "health",            tierWeight: { standard: 1 },  typeWeight: { delight: 1 } },

  // Lookup signals — facts, definitions
  { pattern: "what is",           tierWeight: { fast: 1 },      typeWeight: { lookup: 3 } },
  { pattern: "who is",            tierWeight: { fast: 1 },      typeWeight: { lookup: 3 } },
  { pattern: "define",            tierWeight: { fast: 1 },      typeWeight: { lookup: 3 } },
  { pattern: "definition",        tierWeight: { fast: 1 },      typeWeight: { lookup: 3 } },
  { pattern: "tell me about",     tierWeight: { fast: 1, standard: 1 }, typeWeight: { lookup: 2, delight: 1 } },
  { pattern: "meaning of",        tierWeight: { fast: 1 },      typeWeight: { lookup: 3 } },
];

/**
 * Classify query complexity and type using weighted scoring.
 */
export function classifyQuery(query: string): QueryClassification {
  const lower = query.toLowerCase();
  const wordCount = query.split(/\s+/).length;

  // Accumulate tier scores
  const tierScores: Record<ModelTier, number> = { fast: 0, standard: 0, powerful: 0 };
  // Accumulate type scores
  const typeScores: Record<QueryType, number> = { tool: 0, delight: 0, "live-data": 0, comparison: 0, lookup: 0 };

  for (const signal of SIGNALS) {
    if (lower.includes(signal.pattern)) {
      for (const [tier, weight] of Object.entries(signal.tierWeight)) {
        tierScores[tier as ModelTier] += weight;
      }
      for (const [type, weight] of Object.entries(signal.typeWeight)) {
        typeScores[type as QueryType] += weight;
      }
    }
  }

  // Word count boosts
  if (wordCount > 30) tierScores.powerful += 3;
  else if (wordCount > 15) tierScores.standard += 2;

  // Pick tier: highest score wins, with tie-breaking toward cheaper models
  let tier: ModelTier = "fast";
  if (tierScores.powerful > tierScores.standard && tierScores.powerful > tierScores.fast) {
    tier = "powerful";
  } else if (tierScores.standard > tierScores.fast) {
    tier = "standard";
  }

  // Delight and comparison queries need at least standard — Haiku produces minimal output
  const queryType = pickQueryType(typeScores);
  if ((queryType === "delight" || queryType === "comparison") && tier === "fast") {
    tier = "standard";
  }

  return { tier, queryType };
}

function pickQueryType(scores: Record<QueryType, number>): QueryType {
  let best: QueryType = "lookup";
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = type as QueryType;
    }
  }
  return best;
}

/**
 * Backward-compatible wrapper: returns just the ModelTier.
 */
export function classifyComplexity(query: string): ModelTier {
  return classifyQuery(query).tier;
}

/**
 * Prompt for the ambiguity classifier.
 * Returns JSON: either { action: "build" } or { action: "clarify", questions: [...] }
 */
export const CLARIFY_PROMPT = `You decide whether a user's question has enough context to build an interactive tool, or needs 1-3 quick clarifying questions first.

Rules:
- If the question is self-contained (e.g., "how do I make butter chicken", "any earthquakes today"), return { "action": "build" }.
- If the question depends on implicit context the user hasn't provided — country, city, currency, personal details like age/income bracket, or which specific variant they mean — return clarifying questions.
- Maximum 3 questions. Each question has 3-5 suggested options plus allowCustom: true so the user can type their own.
- Keep questions SHORT (under 10 words). Keep options SHORT (1-3 words each).
- Only ask questions that genuinely change the output. Don't ask for preferences that can be sliders in the tool.

Return ONLY valid JSON in one of these formats:

Format 1 — no clarification needed:
{ "action": "build" }

Format 2 — clarification needed:
{
  "action": "clarify",
  "questions": [
    {
      "id": "country",
      "question": "Which country's tax system?",
      "options": ["India", "US", "UK"],
      "allowCustom": true
    }
  ]
}`;

/**
 * Call the LLM via OpenRouter and get back the JSON response.
 */
export async function callLLM(
  apiKey: string,
  tier: ModelTier,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ text: string; model: string; provider: string }> {
  const model = MODELS[tier];

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://yukti.soumyosinha.com",
      "X-Title": "Yukti",
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt + "\n\nIMPORTANT: Return ONLY valid JSON. No markdown fences, no explanation." },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter API error (${res.status}): ${errText}`);
  }

  const rawBody = await res.text();
  let data: { choices?: { message?: { content?: string } }[]; model?: string; error?: { message?: string } };
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new Error(`OpenRouter returned non-JSON: ${rawBody.slice(0, 200)}`);
  }

  if (data.error) {
    throw new Error(`OpenRouter error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`OpenRouter returned empty content. Raw: ${rawBody.slice(0, 300)}`);
  }

  return {
    text: content,
    model: data.model || model.id,
    provider: "openrouter",
  };
}
