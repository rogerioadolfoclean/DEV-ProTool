import { NextRequest, NextResponse } from "next/server";
import { generateAiText, normalizeAiProvider } from "@/lib/ai-provider";
import { audit, exigerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await exigerSession();
    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) return NextResponse.json({ error: "prompt_required" }, { status: 422 });
    const provider = normalizeAiProvider(body.provider);
    const result = await generateAiText({ provider, system: typeof body.system === "string" ? body.system : "Tu es l'assistant IA d'OmniComm 360. Réponds de façon précise, professionnelle et concise.", prompt });
    await audit("consultation_ia_commerciale", provider, `Mode: ${typeof body.prompt === "string" ? body.prompt.slice(0, 120) : "—"}`);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ai_provider_error" }, { status: 502 });
  }
}
