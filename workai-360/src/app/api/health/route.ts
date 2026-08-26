import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'workai-360', database: 'postgresql', timestamp: new Date().toISOString() })
}
