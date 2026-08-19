import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET(){
  try {
    const [stats,calls,campaigns,client] = await Promise.all([
      pool.query(`SELECT COUNT(*) FILTER (WHERE started_at::date=CURRENT_DATE) today, COUNT(*) FILTER (WHERE status='completed') success, COUNT(*) FILTER (WHERE outcome IN ('converted','appointment')) conversions, COUNT(*) FILTER (WHERE status IN ('waiting','no_answer','busy')) waiting, COUNT(*) FILTER (WHERE status='failed') failures FROM calls`),
      pool.query(`SELECT c.id,c.name,c.phone,cl.campaign,cl.status,cl.duration_seconds duration,cl.outcome,cl.intent FROM calls cl JOIN clients c ON c.id=cl.client_id ORDER BY cl.started_at DESC LIMIT 12`),
      pool.query(`SELECT name,progress,status FROM campaigns ORDER BY id`),
      pool.query(`SELECT external_id,name,phone,email,city,status FROM clients ORDER BY id LIMIT 1`)
    ]);
    return NextResponse.json({stats:{today:Number(stats.rows[0].today),success:Number(stats.rows[0].success),conversions:Number(stats.rows[0].conversions),waiting:Number(stats.rows[0].waiting),failures:Number(stats.rows[0].failures)},calls:calls.rows,campaigns:campaigns.rows,actions:[{name:'Rappeler Marie-Louise K.',time:"Aujourd'hui à 14:30",type:'calendar'},{name:'Relancer Paul Tshibangu',time:'Demain à 09:00',type:'phone'},{name:'Envoyer offre par email',time:'Sophie Lumbu',type:'mail'}],aiSummary:['Aujourd’hui, le taux de réussite est bon avec 67.6% d’appels aboutis.','Les clients sont réceptifs aux offres.','Plusieurs demandes de reprogrammation de rendez-vous.','Taux de conversion en hausse.','Recommandation : augmenter les rappels entre 10h et 12h.'],client:client.rows[0]});
  }catch{return NextResponse.json({error:'database_unavailable'},{status:503});}
}

export async function POST(req:Request){
  try{const body=await req.json(); await pool.query(`UPDATE calls SET status='in_progress',started_at=now() WHERE id=$1`,[body.clientId]); return NextResponse.json({ok:true});}
  catch{return NextResponse.json({ok:false},{status:400});}
}
