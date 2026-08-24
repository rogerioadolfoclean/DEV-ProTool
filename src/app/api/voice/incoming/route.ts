import { pool } from "@/lib/db";
import { twiml, voiceBase } from "@/lib/ivr";
import { menuLangues } from "@/lib/ivr-langues";

export const dynamic = "force-dynamic";

// Webhook appele par Twilio quand un client APPELLE le numero OmniComm 360°.
// Etape 1 : accueil + selection de langue (8 langues).
async function handler(req: Request): Promise<Response> {
  let from = "";
  let sid = "";
  try {
    const form = await req.formData();
    from = String(form.get("From") || "");
    sid = String(form.get("CallSid") || "");
  } catch {
    /* GET de test : pas de corps */
  }

  if (sid) {
    try {
      await pool.query(
        `INSERT INTO calls (campaign, status, direction, provider, provider_call_id, phone_number)
         VALUES ('Accueil IVR', 'ringing', 'inbound', 'twilio', $1, $2)
         ON CONFLICT DO NOTHING`,
        [sid, from],
      );
    } catch { /* ignore */ }
  }

  const xml =
    `<Gather numDigits="1" action="${voiceBase()}/menu" method="POST" timeout="10">${menuLangues()}</Gather>` +
    `<Redirect method="POST">${voiceBase()}/incoming</Redirect>`;

  return twiml(xml);
}

export const GET = handler;
export const POST = handler;
