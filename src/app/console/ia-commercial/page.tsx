import { exigerSession } from "@/lib/auth";
import AiCommercial from "@/components/ai-commercial";
export default async function IaCommercialPage(){await exigerSession();return <AiCommercial mode="consult"/>}
