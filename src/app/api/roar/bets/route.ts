import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ bets: [] })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  return NextResponse.json({ bet: body, persisted: false, localOnly: true })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  return NextResponse.json({ bet: body, persisted: false, localOnly: true })
}
