import { pool } from "@/lib/db";
import { twiml } from "@/lib/ivr";
import { dire, t, type LangCode } from "@/lib/ivr-langues";

export const dynamic = "force-dynamic";

// Recoit l'enregistrement du message vocal laisse par l'appelant.
export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const lang = (url.searchParams.get("lang") as LangCode) || "fr";
  const form = await req.formData();
  const sid = String(form.get("CallSid") || "");
  const recordingUrl = String(form.get("RecordingUrl") || "");
  const duree = Number(form.get("RecordingDuration") || 0);

  if (sid && recordingUrl) {
    try {
      await pool.query(
        `UPDATE calls SET recording_url=$1, outcome='message_vocal', duration_seconds=CASE WHEN $2>0 THEN $2 ELSE duration_seconds END WHERE provider_call_id=$3`,
        [recordingUrl, duree, sid],
      );
    } catch { /* ignore */ }
  }

  return twiml(dire(lang, t(lang, "aurevoir")) + `<Hangup/>`);
}
