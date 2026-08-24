import { NextResponse } from "next/server";
import { urlBase } from "@/lib/gateway";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    accountSid: Boolean(process.env.TWILIO_ACCOUNT_SID),
    authToken: Boolean(process.env.TWILIO_AUTH_TOKEN),
    phoneNumber: Boolean(process.env.TWILIO_PHONE_NUMBER),
    appUrl: Boolean(urlBase()), // repli automatique (VERCEL_URL / defaut), plus besoin de APP_URL
    database: Boolean(process.env.DATABASE_URL),
  };
  return NextResponse.json({ configured: Object.values(checks).every(Boolean), checks, base: urlBase() });
}
