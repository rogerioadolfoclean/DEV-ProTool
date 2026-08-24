import { exigerSession } from "@/lib/auth";
import AiVendeur from "@/components/ai-vendeur";
export default async function AiVendeurPage(){await exigerSession();return <AiVendeur/>}
