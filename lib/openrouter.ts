// OpenRouter chat helper — OpenAI-compatible API. Used for in-app LLM calls
// (daily summary, stuck-contact suggestions, ICP classifier, profile parse).
// Free tier: ~20 req/min, ~50 req/day per model without account credit.
//
// FALLBACK: if OpenRouter rate-limits (HTTP 429) or auth-fails (401/403), we
// transparently retry against the OpenAI API (gpt-4o-mini for text,
// gpt-4o-mini for vision) when OPENAI_API_KEY is set. Lets you keep using the
// free tier for the bulk of calls while never hitting a hard wall.
//
// All callers should use lib/ai-cache.ts to avoid burning the daily limit.

export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const isOpenRouterConfigured = () => !!OPENROUTER_API_KEY;
export const isOpenAIConfigured = () => !!OPENAI_API_KEY;

// Free models we use. Override per-call if you want.
// The OpenRouter free catalog shifts — verify with:
//   curl https://openrouter.ai/api/v1/models | jq '.data[] | select(.pricing.prompt=="0") | .id'
// Free tier limits (no account credit): ~20 req/min per model, ~50/day total.
// Add a one-time $10 credit at https://openrouter.ai/credits to unlock the
// extended free tier (much higher daily quota); the models stay free.
export const MODELS = {
  fast: "deepseek/deepseek-v4-flash:free",                          // classifier, short suggestions — 1M ctx
  prose: "openai/gpt-oss-120b:free",                                // narrative summaries — 131k ctx
  vision: "nvidia/nemotron-nano-12b-v2-vl:free",                    // OCR / screenshot parsing — 128k ctx
} as const;

// Fallbacks within OpenRouter (free models, not paid).
export const FALLBACK_MODELS = {
  vision: ["google/gemma-4-26b-a4b-it:free", "moonshotai/kimi-k2.6:free"],
  prose: ["meta-llama/llama-3.3-70b-instruct:free", "qwen/qwen3-next-80b-a3b-instruct:free", "z-ai/glm-4.5-air:free"],
} as const;

// OpenAI paid fallback when OpenRouter hits a wall.
// gpt-4o-mini: ~$0.15/M input, $0.60/M output, supports vision + json mode.
export const OPENAI_FALLBACK_MODELS = {
  text: "gpt-4o-mini",
  vision: "gpt-4o-mini",
} as const;

type ChatOpts = {
  model?: string;
  json?: boolean;          // request response_format=json_object
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
};

// Errors where we should try OpenAI instead of giving up.
function shouldFallback(status: number): boolean {
  // 429 rate limit, 402 payment required (free credit exhausted),
  // 401/403 auth (key dead — paid OpenAI is at least usable until they rotate)
  return status === 429 || status === 402 || status === 401 || status === 403;
}

async function callChatCompletions(
  endpoint: string,
  apiKey: string,
  body: Record<string, any>,
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    const err: any = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(`unexpected response shape: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return content;
}

async function callOpenRouter(body: Record<string, any>): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not set");
  return callChatCompletions(
    "https://openrouter.ai/api/v1/chat/completions",
    OPENROUTER_API_KEY,
    body,
    {
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
      "X-Title": "Unicorn Studio AI Business Manager",
    }
  );
}

async function callOpenAI(body: Record<string, any>): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  return callChatCompletions(
    "https://api.openai.com/v1/chat/completions",
    OPENAI_API_KEY,
    body
  );
}

export async function chat(prompt: string, opts: ChatOpts = {}): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  if (opts.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
  messages.push({ role: "user", content: prompt });

  const baseBody: Record<string, any> = {
    messages,
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.maxTokens) baseBody.max_tokens = opts.maxTokens;
  if (opts.json) baseBody.response_format = { type: "json_object" };

  // Try OpenRouter first if configured
  if (OPENROUTER_API_KEY) {
    try {
      return await callOpenRouter({ ...baseBody, model: opts.model ?? MODELS.fast });
    } catch (e: any) {
      const status = e?.status ?? 0;
      if (!isOpenAIConfigured() || !shouldFallback(status)) {
        throw new Error(`OpenRouter ${status || ""}: ${e?.message ?? e}`);
      }
      // fall through to OpenAI
      console.warn(`[openrouter] fell back to OpenAI (status ${status})`);
    }
  } else if (!isOpenAIConfigured()) {
    throw new Error("Neither OPENROUTER_API_KEY nor OPENAI_API_KEY is set");
  }

  // OpenAI fallback (or primary if OR not configured)
  return callOpenAI({ ...baseBody, model: OPENAI_FALLBACK_MODELS.text });
}

// Multi-modal chat — for vision tasks (image OCR, profile screenshots, etc).
// Image input is a data URL ("data:image/png;base64,...") or a public https URL.
export async function chatVision(
  prompt: string,
  imageUrls: string[],
  opts: ChatOpts = {}
): Promise<string> {
  const messages: any[] = [];
  if (opts.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });

  const userContent: any[] = [{ type: "text", text: prompt }];
  for (const url of imageUrls) {
    userContent.push({ type: "image_url", image_url: { url } });
  }
  messages.push({ role: "user", content: userContent });

  const baseBody: Record<string, any> = {
    messages,
    temperature: opts.temperature ?? 0.3,
  };
  if (opts.maxTokens) baseBody.max_tokens = opts.maxTokens;
  if (opts.json) baseBody.response_format = { type: "json_object" };

  if (OPENROUTER_API_KEY) {
    try {
      return await callOpenRouter({ ...baseBody, model: opts.model ?? MODELS.vision });
    } catch (e: any) {
      const status = e?.status ?? 0;
      if (!isOpenAIConfigured() || !shouldFallback(status)) {
        throw new Error(`OpenRouter ${status || ""}: ${e?.message ?? e}`);
      }
      console.warn(`[openrouter] vision fell back to OpenAI (status ${status})`);
    }
  } else if (!isOpenAIConfigured()) {
    throw new Error("Neither OPENROUTER_API_KEY nor OPENAI_API_KEY is set");
  }

  return callOpenAI({ ...baseBody, model: OPENAI_FALLBACK_MODELS.vision });
}
