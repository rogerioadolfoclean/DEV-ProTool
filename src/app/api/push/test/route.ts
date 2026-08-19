import { NextResponse } from "next/server";
import { exigerEcriture } from "@/lib/auth";
import { envoyerPush } from "@/lib/push-gateway";

export async function POST() {
  try {
    const session = await exigerEcriture();
    const result = await envoyerPush(
      "OmniComm 360°",
      "Test de notification push réussi.",
      [String(session.uid)],
    );
    if (result.mode === "demo") {
      return NextResponse.json({ ok: false, message: result.raison }, { status: 503 });
    }
    if (result.statut === "echoue") {
      return NextResponse.json({ ok: false, message: result.erreur ?? "Échec OneSignal" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, message: `Notification envoyée (${result.fournisseurId ?? "ID fournisseur inconnu"}).` });
  } catch {
    return NextResponse.json({ ok: false, message: "Session ou service push indisponible." }, { status: 401 });
  }
}
