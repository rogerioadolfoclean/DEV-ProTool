import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

function csv(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        cl.id,
        cl.started_at,
        c.external_id AS client_id,
        c.name AS client,
        c.phone,
        cl.campaign,
        cl.direction,
        cl.status,
        cl.duration_seconds,
        cl.outcome,
        cl.intent,
        cl.provider
      FROM calls cl
      LEFT JOIN clients c ON c.id = cl.client_id
      ORDER BY cl.started_at DESC
      LIMIT 5000
    `);

    const headers = [
      "id", "date", "client_id", "client", "telephone", "campagne",
      "direction", "statut", "duree_secondes", "resultat", "intention", "fournisseur",
    ];
    const rows = result.rows.map((row) => [
      row.id, row.started_at, row.client_id, row.client, row.phone, row.campaign,
      row.direction, row.status, row.duration_seconds, row.outcome, row.intent, row.provider,
    ]);

    const body = [headers, ...rows].map((row) => row.map(csv).join(",")).join("\n");
    return new NextResponse("\uFEFF" + body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="omnicomm-appels-${new Date().toISOString().slice(0, 10)}.csv"`,
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
