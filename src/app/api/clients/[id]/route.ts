import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getId(params: Promise<{ id: string }>) {
  const { id } = await params;
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) throw new Error("ID client invalide");
  return value;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await getId(params);
    const result = await pool.query(
      `SELECT id, external_id, name, phone, email, city, status, last_contact_at, created_at
       FROM clients WHERE id=$1`,
      [id],
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur" }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await getId(params);
    const body = await req.json();
    if (!body.name || !body.phone) return NextResponse.json({ error: "Nom et téléphone sont obligatoires" }, { status: 422 });
    const result = await pool.query(
      `UPDATE clients
       SET name=$1, phone=$2, email=$3, city=$4, status=$5
       WHERE id=$6
       RETURNING id, external_id, name, phone, email, city, status, last_contact_at, created_at`,
      [body.name.trim(), body.phone.trim(), body.email?.trim() || null, body.city?.trim() || null, body.status || "active", id],
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Modification impossible" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  try {
    const id = await getId(params);
    const calls = await client.query(`SELECT COUNT(*)::int AS count FROM calls WHERE client_id=$1`, [id]);
    if (calls.rows[0].count > 0) {
      return NextResponse.json(
        { error: "Ce client possède un historique d'appels. Désactivez-le au lieu de le supprimer afin de conserver les données. " },
        { status: 409 },
      );
    }
    const result = await client.query(`DELETE FROM clients WHERE id=$1 RETURNING id, external_id, name`, [id]);
    if (!result.rows[0]) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    return NextResponse.json({ ok: true, data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Suppression impossible" }, { status: 400 });
  } finally {
    client.release();
  }
}
