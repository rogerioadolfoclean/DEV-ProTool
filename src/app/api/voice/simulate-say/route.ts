import { twiml } from "@/lib/ivr";
import { dire } from "@/lib/ivr-langues";

export const dynamic = "force-dynamic";

// Message joue au decroche pendant la simulation de bascule.
async function handler(req: Request): Promise<Response> {
  const leg = new URL(req.url).searchParams.get("leg") || "principal";
  const message =
    leg === "secondaire"
      ? "Bonjour Rogerio. Le numero principal, la maison, n'a pas repondu. La plateforme OmniComm 360 a bascule automatiquement vers votre numero secondaire, le cellulaire. La bascule fonctionne parfaitement. Au revoir."
      : "Bonjour Rogerio. Ceci est un appel de test de la plateforme OmniComm 360, arrive sur votre numero principal, la ligne maison. La reception des appels fonctionne. Au revoir.";
  return twiml(dire("fr", message) + `<Hangup/>`);
}

export const GET = handler;
export const POST = handler;
