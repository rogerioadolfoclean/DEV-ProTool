import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  try {
    const result = await pool.query(
      `SELECT id, external_id, name, phone, email, city, status, last_contact_at, created_at
       FROM clients
       WHERE ($1 = '' OR name ILIKE '%' || $1 || '%' OR phone ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
       ORDER BY created_at DESC, id DESC`,
      [q],
    );
    return NextResponse.json({ data: result.rows, total: result.rowCount ?? result.rows.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur base de données" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !body.phone) return NextResponse.json({ error: "name et phone sont obligatoires" }, { status: 422 });
    const externalId = body.external_id || `CLI-${Date.now().toString().slice(-6)}`;
    const result = await pool.query(
      `INSERT INTO clients (external_id,name,phone,email,city,status) VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, external_id, name, phone, email, city, status, last_contact_at, created_at`,
      [externalId, body.name, body.phone, body.email ?? null, body.city ?? null, body.status ?? "active"],
    );
    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Création impossible" }, { status: 400 });
  }
}
