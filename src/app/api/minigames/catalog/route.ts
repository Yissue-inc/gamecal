import { NextResponse } from 'next/server'
import { MINI_GAMES } from '@/lib/minigames'

export function GET() {
  return NextResponse.json({ games: MINI_GAMES })
}
