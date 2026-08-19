import { NextResponse } from "next/server";

export const dynamic="force-dynamic";

export async function GET(){
 const checks={accountSid:Boolean(process.env.TWILIO_ACCOUNT_SID),authToken:Boolean(process.env.TWILIO_AUTH_TOKEN),phoneNumber:Boolean(process.env.TWILIO_PHONE_NUMBER),appUrl:Boolean(process.env.APP_URL),database:Boolean(process.env.DATABASE_URL)};
 return NextResponse.json({configured:Object.values(checks).every(Boolean),checks});
}
