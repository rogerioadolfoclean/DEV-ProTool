import "server-only";
import nodemailer from "nodemailer";

export type ResultatEmail =
  | { mode: "demo"; raison: string }
  | { mode: "reel"; statut: "envoye" | "echoue"; fournisseurId: string | null; erreur: string | null };

function smtp() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({ host, port, secure: process.env.SMTP_SECURE === "true" || port === 465, auth: { user, pass } });
}

export async function envoyerEmail(de: string, vers: string, sujet: string, contenu: string): Promise<ResultatEmail> {
  const transport = smtp();
  if (!transport) return { mode: "demo", raison: "SMTP_HOST / SMTP_USER / SMTP_PASSWORD absents — aucun e-mail physique" };
  try {
    const info = await transport.sendMail({ from: de, to: vers, subject: sujet || "OmniComm 360", text: contenu });
    return { mode: "reel", statut: "envoye", fournisseurId: info.messageId ?? null, erreur: null };
  } catch (e) {
    return { mode: "reel", statut: "echoue", fournisseurId: null, erreur: e instanceof Error ? e.message : "Serveur SMTP injoignable" };
  }
}
