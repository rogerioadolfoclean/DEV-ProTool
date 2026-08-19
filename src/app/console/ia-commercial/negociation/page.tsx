import { exigerSession } from "@/lib/auth";
import AiCommercial from "@/components/ai-commercial";
export default async function NegociationPage(){await exigerSession();return <AiCommercial mode="negotiate"/>}
