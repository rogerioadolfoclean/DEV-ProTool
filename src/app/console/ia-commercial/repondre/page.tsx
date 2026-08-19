import { exigerSession } from "@/lib/auth";
import AiCommercial from "@/components/ai-commercial";
export default async function RepondrePage(){await exigerSession();return <AiCommercial mode="respond"/>}
