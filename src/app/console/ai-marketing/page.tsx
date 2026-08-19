import { exigerSession } from "@/lib/auth";
import AiMarketing from "@/components/ai-marketing";
export default async function AiMarketingPage(){await exigerSession();return <AiMarketing/>}
