import { NextRequest, NextResponse } from "next/server";
import { generateAiText, normalizeAiProvider } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) return NextResponse.json({ error: "prompt_required" }, { status: 422 });

    const provider = normalizeAiProvider(body.provider);
    const result = await generateAiText({
      provider,
      system: "Tu es l'assistant IA d'OmniComm 360. Réponds de façon précise, professionnelle et concise.",
      prompt,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ai_provider_error" },
      { status: 502 }
    );
  }
}
