import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const email = body.email?.trim()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  // MVP: accept subscription (Supabase subscribers table when configured)
  return NextResponse.json({ success: true, email })
}
