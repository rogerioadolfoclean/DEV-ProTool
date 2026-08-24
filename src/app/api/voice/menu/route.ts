import { pool } from "@/lib/db";
import { twiml, voiceBase, IVR } from "@/lib/ivr";
import { dire, t, DIGIT_TO_LANG, type LangCode } from "@/lib/ivr-langues";

export const dynamic = "force-dynamic";

function boiteVocale(lang: LangCode): string {
  return (
    dire(lang, t(lang, "vm")) +
    `<Record action="${voiceBase()}/voicemail?lang=${lang}" method="POST" maxLength="120" playBeep="true" finishOnKey="#" timeout="5"/>` +
    dire(lang, t(lang, "rien")) +
    `<Hangup/>`
  );
}

function menuService(lang: LangCode): string {
  return (
    `<Gather numDigits="1" action="${voiceBase()}/menu?lang=${lang}" method="POST" timeout="8">` +
    dire(lang, t(lang, "bienvenue")) +
    dire(lang, t(lang, "menu")) +
    `</Gather>` +
    `<Redirect method="POST">${voiceBase()}/menu?lang=${lang}</Redirect>`
  );
}

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const langParam = url.searchParams.get("lang") as LangCode | null;
  const form = await req.formData();
  const digit = String(form.get("Digits") || "");
  const from = String(form.get("From") || "");
  const sid = String(form.get("CallSid") || "");

  // PHASE 1 : pas encore de langue -> le digit choisit la langue.
  if (!langParam) {
    const lang = DIGIT_TO_LANG[digit];
    if (!lang) {
      return twiml(`<Redirect method="POST">${voiceBase()}/incoming</Redirect>`);
    }
    if (sid) {
      try { await pool.query(`UPDATE calls SET menu_choice=$1 WHERE provider_call_id=$2`, [lang, sid]); } catch { /* ignore */ }
    }
    return twiml(menuService(lang));
  }

  // PHASE 2 : langue connue -> le digit choisit le service.
  const lang = langParam;
  if (sid && digit) {
    try { await pool.query(`UPDATE calls SET menu_choice=$1 WHERE provider_call_id=$2`, [`${lang}:${digit}`, sid]); } catch { /* ignore */ }
  }

  let xml: string;
  switch (digit) {
    case "1": {
      const conseiller = IVR.numeroConseiller();
      if (conseiller) {
        xml =
          dire(lang, t(lang, "relation")) +
          `<Dial timeout="25" callerId="${from}"><Number>${conseiller}</Number></Dial>` +
          dire(lang, t(lang, "indispo")) +
          boiteVocale(lang);
      } else {
        xml = dire(lang, t(lang, "indispo")) + boiteVocale(lang);
      }
      break;
    }
    case "2":
      xml = dire(lang, t(lang, "support")) + boiteVocale(lang);
      break;
    case "3":
      xml = boiteVocale(lang);
      break;
    case "9":
      xml = `<Redirect method="POST">${voiceBase()}/incoming</Redirect>`;
      break;
    default:
      xml = dire(lang, t(lang, "nonreconnu")) + `<Redirect method="POST">${voiceBase()}/menu?lang=${lang}</Redirect>`;
  }
  return twiml(xml);
}
