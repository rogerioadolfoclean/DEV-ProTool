import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

function csv(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT external_id, name, phone, email, city, country, status, last_contact_at, created_at
       FROM clients ORDER BY created_at DESC, id DESC LIMIT 10000`,
    );
    const headers = ["id_client", "nom", "telephone", "email", "ville", "pays", "statut", "dernier_contact", "cree_le"];
    const rows = result.rows.map((r) => [
      r.external_id, r.name, r.phone, r.email, r.city, r.country, r.status, r.last_contact_at, r.created_at,
    ]);
    const body = [headers, ...rows].map((row) => row.map(csv).join(",")).join("\n");
    return new NextResponse("﻿" + body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="omnicomm-clients-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "export_failed", message: error instanceof Error ? error.message : "Erreur d'exportation" },
      { status: 500 },
    );
  }
}
