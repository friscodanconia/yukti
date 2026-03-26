/**
 * LLM Router — uses OpenRouter as a unified gateway.
 * Picks the best model based on query complexity.
 * Abstracts away model choice from the user entirely.
 */

export type ModelTier = "fast" | "standard" | "powerful";

export interface ModelConfig {
  id: string;
  label: string;
}

const MODELS: Record<ModelTier, ModelConfig> = {
  fast: {
    id: "anthropic/claude-3.5-haiku",
    label: "Claude 3.5 Haiku",
  },
  standard: {
    id: "anthropic/claude-sonnet-4",
    label: "Claude Sonnet 4",
  },
  powerful: {
    id: "anthropic/claude-opus-4",
    label: "Claude Opus 4",
  },
};

/**
 * Classify query complexity using simple heuristics (no LLM call).
 */
export function classifyComplexity(query: string): ModelTier {
  const lower = query.toLowerCase();
  const wordCount = query.split(/\s+/).length;

  const complexSignals = [
    "simulate", "simulation", "agent", "cellular",
    "over time", "compound", "monte carlo", "probability",
    "dynamically", "system dynamics", "feedback loop",
    "multiple variables", "interaction between",
  ];

  const mediumSignals = [
    "compare", "versus", "vs", "calculate", "how much",
    "what if", "trade-off", "tradeoff", "pros and cons",
    "difference between", "which is better", "should i",
    "current rate", "real data", "latest", "today",
  ];

  const hasComplex = complexSignals.some(s => lower.includes(s));
  const hasMedium = mediumSignals.some(s => lower.includes(s));

  if (hasComplex || wordCount > 30) return "powerful";
  if (hasMedium || wordCount > 15) return "standard";
  return "fast";
}

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
