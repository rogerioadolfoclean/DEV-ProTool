import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await sql`
      SELECT current_database() AS database_name,
             current_schema() AS schema_name,
             current_user AS database_user,
             version() AS postgres_version
    `

    return NextResponse.json({
      ok: true,
      database: result[0],
    })
  } catch (error) {
    console.error('WORKAI database health check failed', error)
    return NextResponse.json(
      { ok: false, error: 'Database connection failed' },
      { status: 503 },
    )
  }
}
