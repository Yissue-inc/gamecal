import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  const adminSecret = process.env.ADMIN_SECRET

  if (!adminSecret || secret !== adminSecret) {
    return NextResponse.json({ valid: false }, { status: 401 })
  }

  return NextResponse.json({ valid: true })
}
