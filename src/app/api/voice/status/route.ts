import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const sid = String(form.get("CallSid") || "");
    const status = String(form.get("CallStatus") || "");
    const duration = Number(form.get("CallDuration") || 0);
    const answeredBy = String(form.get("AnsweredBy") || "");

    if (sid) {
      const answered = status === "in-progress" || status === "answered" || answeredBy === "human";
      const terminal = ["completed", "busy", "failed", "no-answer", "canceled"].includes(status);
      await pool.query(
        `UPDATE calls
         SET status=$1,
             answered_at=CASE WHEN $2 AND answered_at IS NULL THEN NOW() ELSE answered_at END,
             duration_seconds=CASE WHEN $3 > 0 THEN $3 ELSE duration_seconds END,
             ended_at=CASE WHEN $4 THEN NOW() ELSE ended_at END
         WHERE provider='twilio' AND provider_call_id=$5`,
        [status, answered, duration, terminal, sid],
      );
    }
    return NextResponse.json({ ok: true, recorded: Boolean(sid), status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook error" }, { status: 500 });
  }
}
