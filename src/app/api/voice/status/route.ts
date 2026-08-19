import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic="force-dynamic";

export async function POST(req:Request){
 const form=await req.formData(); const sid=String(form.get("CallSid")||""); const status=String(form.get("CallStatus")||""); const duration=Number(form.get("CallDuration")||0);
 if(sid){await pool.query(`UPDATE calls SET status=$1,duration_seconds=$2,ended_at=CASE WHEN $1 IN ('completed','busy','failed','no-answer','canceled') THEN now() ELSE ended_at END WHERE provider='twilio' AND provider_call_id=$3`,[status,duration,sid]);}
 return NextResponse.json({ok:true});
}
