import "server-only";

export type AiProvider = "claude" | "openai" | "deepseek" | "gemini" | "mistral";
export const DEFAULT_AI_PROVIDER: AiProvider = "claude";
export const AI_MODELS: Record<AiProvider, string> = {
  claude: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
  openai: process.env.OPENAI_MODEL || "gpt-5.6",
  deepseek: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  gemini: process.env.GEMINI_MODEL || "gemini-3.6-flash",
  mistral: process.env.MISTRAL_MODEL || "mistral-large-latest",
};
export function normalizeAiProvider(value: unknown): AiProvider {
  return value === "openai" || value === "deepseek" || value === "gemini" || value === "mistral" ? value : "claude";
}
async function compatible(url: string, key: string, model: string, system: string | undefined, prompt: string, maxTokens: number) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: prompt }], max_tokens: maxTokens }) });
  if (!r.ok) throw new Error(`${model} ${r.status}: ${(await r.text()).slice(0, 500)}`);
  const d = await r.json(); return d.choices?.[0]?.message?.content ?? "";
}
export async function generateAiText({ provider, system, prompt, maxTokens = 2048 }: { provider?: AiProvider; system?: string; prompt: string; maxTokens?: number }) {
  const selected = normalizeAiProvider(provider ?? DEFAULT_AI_PROVIDER);
  if (selected === "openai") {
    const key = process.env.OPENAI_API_KEY; if (!key) throw new Error("OPENAI_API_KEY manquante");
    const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: AI_MODELS.openai, ...(system ? { instructions: system } : {}), input: prompt, max_output_tokens: maxTokens }) });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 500)}`); const d = await r.json(); return { provider: selected, model: AI_MODELS.openai, text: d.output_text ?? "" };
  }
  if (selected === "deepseek") { const key = process.env.DEEPSEEK_API_KEY; if (!key) throw new Error("DEEPSEEK_API_KEY manquante"); return { provider: selected, model: AI_MODELS.deepseek, text: await compatible("https://api.deepseek.com/chat/completions", key, AI_MODELS.deepseek, system, prompt, maxTokens) }; }
  if (selected === "mistral") { const key = process.env.MISTRAL_API_KEY; if (!key) throw new Error("MISTRAL_API_KEY manquante"); return { provider: selected, model: AI_MODELS.mistral, text: await compatible("https://api.mistral.ai/v1/chat/completions", key, AI_MODELS.mistral, system, prompt, maxTokens) }; }
  if (selected === "gemini") {
    const key = process.env.GEMINI_API_KEY; if (!key) throw new Error("GEMINI_API_KEY manquante");
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS.gemini}:generateContent?key=${encodeURIComponent(key)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens } }) });
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 500)}`); const d = await r.json(); const text = d.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("\n") ?? ""; return { provider: selected, model: AI_MODELS.gemini, text };
  }
  const key = process.env.ANTHROPIC_API_KEY; if (!key) throw new Error("ANTHROPIC_API_KEY manquante");
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: AI_MODELS.claude, max_tokens: maxTokens, ...(system ? { system } : {}), messages: [{ role: "user", content: prompt }] }) });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 500)}`); const d = await r.json(); const text = Array.isArray(d.content) ? d.content.filter((x: { type?: string }) => x.type === "text").map((x: { text?: string }) => x.text ?? "").join("\n") : ""; return { provider: selected, model: AI_MODELS.claude, text };
}
