import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    { entry: null, message: 'Promotions are currently paused' },
    { status: 410 }
  )
}
