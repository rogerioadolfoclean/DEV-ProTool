import "server-only";

/**
 * Multi-LLM orchestration for OmniComm 360°.
 * Claude remains the default. OpenRouter/Together expose a large catalog of
 * open-weight models without coupling the application to a single vendor.
 * Direct providers are also supported when their API keys are configured.
 */
export type AiProvider =
  | "claude"
  | "openai"
  | "deepseek"
  | "gemini"
  | "mistral"
  | "groq"
  | "openrouter"
  | "together"
  | "xai"
  | "cohere"
  | "ollama";

export const DEFAULT_AI_PROVIDER: AiProvider = "claude";

export const AI_MODELS: Record<AiProvider, string> = {
  claude: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
  openai: process.env.OPENAI_MODEL || "gpt-5.6",
  deepseek: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  gemini: process.env.GEMINI_MODEL || "gemini-3.6-flash",
  mistral: process.env.MISTRAL_MODEL || "mistral-large-latest",
  groq: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  openrouter: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct",
  together: process.env.TOGETHER_MODEL || "openai/gpt-oss-20b",
  xai: process.env.XAI_MODEL || "grok-3-mini",
  cohere: process.env.COHERE_MODEL || "command-a-03-2025",
  ollama: process.env.OLLAMA_MODEL || "llama3.2",
};

export function normalizeAiProvider(value: unknown): AiProvider {
  const allowed: AiProvider[] = [
    "claude", "openai", "deepseek", "gemini", "mistral", "groq",
    "openrouter", "together", "xai", "cohere", "ollama",
  ];
  return allowed.includes(value as AiProvider) ? (value as AiProvider) : DEFAULT_AI_PROVIDER;
}

async function compatible(
  url: string,
  key: string | undefined,
  model: string,
  system: string | undefined,
  prompt: string,
  maxTokens: number,
  extraHeaders: Record<string, string> = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (key) headers.Authorization = `Bearer ${key}`;

  const r = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
    }),
  });
  if (!r.ok) throw new Error(`${model} ${r.status}: ${(await r.text()).slice(0, 500)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}

export async function generateAiText({
  provider,
  system,
  prompt,
  maxTokens = 2048,
}: {
  provider?: AiProvider;
  system?: string;
  prompt: string;
  maxTokens?: number;
}) {
  const selected = normalizeAiProvider(provider ?? DEFAULT_AI_PROVIDER);

  if (selected === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY manquante");
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: AI_MODELS.openai,
        ...(system ? { instructions: system } : {}),
        input: prompt,
        max_output_tokens: maxTokens,
      }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 500)}`);
    const d = await r.json();
    return { provider: selected, model: AI_MODELS.openai, text: d.output_text ?? "" };
  }

  if (selected === "deepseek") {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("DEEPSEEK_API_KEY manquante");
    return { provider: selected, model: AI_MODELS.deepseek, text: await compatible("https://api.deepseek.com/chat/completions", key, AI_MODELS.deepseek, system, prompt, maxTokens) };
  }

  if (selected === "mistral") {
    const key = process.env.MISTRAL_API_KEY;
    if (!key) throw new Error("MISTRAL_API_KEY manquante");
    return { provider: selected, model: AI_MODELS.mistral, text: await compatible("https://api.mistral.ai/v1/chat/completions", key, AI_MODELS.mistral, system, prompt, maxTokens) };
  }

  if (selected === "groq") {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY manquante");
    return { provider: selected, model: AI_MODELS.groq, text: await compatible("https://api.groq.com/openai/v1/chat/completions", key, AI_MODELS.groq, system, prompt, maxTokens) };
  }

  if (selected === "openrouter") {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error("OPENROUTER_API_KEY manquante");
    return {
      provider: selected,
      model: AI_MODELS.openrouter,
      text: await compatible(
        "https://openrouter.ai/api/v1/chat/completions",
        key,
        AI_MODELS.openrouter,
        system,
        prompt,
        maxTokens,
        {
          ...(process.env.NEXT_PUBLIC_APP_URL ? { "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL } : {}),
          ...(process.env.OPENROUTER_APP_NAME ? { "X-Title": process.env.OPENROUTER_APP_NAME } : {}),
        }
      ),
    };
  }

  if (selected === "together") {
    const key = process.env.TOGETHER_API_KEY;
    if (!key) throw new Error("TOGETHER_API_KEY manquante");
    return { provider: selected, model: AI_MODELS.together, text: await compatible("https://api.together.xyz/v1/chat/completions", key, AI_MODELS.together, system, prompt, maxTokens) };
  }

  if (selected === "xai") {
    const key = process.env.XAI_API_KEY;
    if (!key) throw new Error("XAI_API_KEY manquante");
    return { provider: selected, model: AI_MODELS.xai, text: await compatible("https://api.x.ai/v1/chat/completions", key, AI_MODELS.xai, system, prompt, maxTokens) };
  }

  if (selected === "cohere") {
    const key = process.env.COHERE_API_KEY;
    if (!key) throw new Error("COHERE_API_KEY manquante");
    const r = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: AI_MODELS.cohere,
        ...(system ? { preamble: system } : {}),
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
        max_tokens: maxTokens,
      }),
    });
    if (!r.ok) throw new Error(`Cohere ${r.status}: ${(await r.text()).slice(0, 500)}`);
    const d = await r.json();
    const text = d.message?.content?.map((x: { type?: string; text?: string }) => x.type === "text" ? x.text ?? "" : "").join("\n") ?? "";
    return { provider: selected, model: AI_MODELS.cohere, text };
  }

  if (selected === "ollama") {
    return {
      provider: selected,
      model: AI_MODELS.ollama,
      text: await compatible(
        process.env.OLLAMA_BASE_URL ? `${process.env.OLLAMA_BASE_URL.replace(/\/$/, "")}/v1/chat/completions` : "http://localhost:11434/v1/chat/completions",
        undefined,
        AI_MODELS.ollama,
        system,
        prompt,
        maxTokens
      ),
    };
  }

  if (selected === "gemini") {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY manquante");
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS.gemini}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    });
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 500)}`);
    const d = await r.json();
    const text = d.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("\n") ?? "";
    return { provider: selected, model: AI_MODELS.gemini, text };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY manquante");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: AI_MODELS.claude,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 500)}`);
  const d = await r.json();
  const text = Array.isArray(d.content)
    ? d.content.filter((x: { type?: string }) => x.type === "text").map((x: { text?: string }) => x.text ?? "").join("\n")
    : "";
  return { provider: selected, model: AI_MODELS.claude, text };
}
