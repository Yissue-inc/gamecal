import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  if (!body?.endpoint) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
