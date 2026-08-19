import "server-only";

export type AiProvider = "claude" | "openai";

export const DEFAULT_AI_PROVIDER: AiProvider = "claude";

export const AI_MODELS: Record<AiProvider, string> = {
  claude: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
  openai: process.env.OPENAI_MODEL || "gpt-5.6-sol",
};

export function normalizeAiProvider(value: unknown): AiProvider {
  return value === "openai" ? "openai" : "claude";
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

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: AI_MODELS.openai,
        ...(system ? { instructions: system } : {}),
        input: prompt,
        max_output_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI ${response.status}: ${detail.slice(0, 500)}`);
    }

    const data = await response.json();
    return { provider: selected, model: AI_MODELS.openai, text: data.output_text ?? "" };
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY manquante");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
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

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Claude ${response.status}: ${detail.slice(0, 500)}`);
  }

  const data = await response.json();
  const text = Array.isArray(data.content)
    ? data.content.filter((x: { type?: string }) => x.type === "text").map((x: { text?: string }) => x.text ?? "").join("\n")
    : "";

  return { provider: selected, model: AI_MODELS.claude, text };
}
