// OpenRouter chat helper — OpenAI-compatible API. Used for in-app LLM calls
// (daily summary, stuck-contact suggestions, ICP classifier). Free tier:
// ~20 req/min, ~50 req/day per model without account credit.
//
// All callers should use lib/ai-cache.ts to avoid burning the daily limit.

export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export const isOpenRouterConfigured = () => !!OPENROUTER_API_KEY;

// Free models we use. Override per-call if you want.
// Check https://openrouter.ai/models?pricing=free for the current catalog — it shifts.
export const MODELS = {
  fast: "deepseek/deepseek-v4-flash:free",                          // classifier, short suggestions
  prose: "openai/gpt-oss-120b:free",                                // narrative summaries
  vision: "google/gemini-2.5-flash-image:free",                     // OCR / image understanding
} as const;

type ChatOpts = {
  model?: string;
  json?: boolean;          // request response_format=json_object
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
};

export async function chat(prompt: string, opts: ChatOpts = {}): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not set");

  const messages: { role: string; content: string }[] = [];
  if (opts.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
  messages.push({ role: "user", content: prompt });

  const body: Record<string, any> = {
    model: opts.model ?? MODELS.fast,
    messages,
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      // OpenRouter recommends these for free tier identification
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
      "X-Title": "Unicorn Studio AI Business Manager",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(`OpenRouter: unexpected response shape: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return content;
}

// Multi-modal chat — for vision tasks (image OCR, profile screenshots, etc).
// Image input is a data URL ("data:image/png;base64,...") or a public https URL.
export async function chatVision(
  prompt: string,
  imageUrls: string[],
  opts: ChatOpts = {}
): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not set");

  const messages: any[] = [];
  if (opts.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });

  // OpenAI-compatible multi-part content
  const userContent: any[] = [{ type: "text", text: prompt }];
  for (const url of imageUrls) {
    userContent.push({ type: "image_url", image_url: { url } });
  }
  messages.push({ role: "user", content: userContent });

  const body: Record<string, any> = {
    model: opts.model ?? MODELS.vision,
    messages,
    temperature: opts.temperature ?? 0.3,
  };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
      "X-Title": "Unicorn Studio AI Business Manager",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(`OpenRouter: unexpected response shape: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return content;
}
