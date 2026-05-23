import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MOCK_EVENTS, isSupabaseConfigured } from '@/lib/mock-data'
import { verifyAdminSecret } from '@/lib/utils'
import type { GameEvent } from '@/types'

function filterMockEvents(params: URLSearchParams): GameEvent[] {
  let events = [...MOCK_EVENTS]
  const game = params.get('game')
  const start = params.get('start')
  const end = params.get('end')

  if (game && game !== 'all') {
    const slugs = game.split(',')
    events = events.filter((e) => e.game && slugs.includes(e.game.slug))
  }
  if (start) {
    const startDate = new Date(start)
    events = events.filter((e) => new Date(e.end_at ?? e.start_at) >= startDate)
  }
  if (end) {
    const endDate = new Date(end)
    events = events.filter((e) => new Date(e.start_at) <= endDate)
  }
  return events
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ events: filterMockEvents(params) })
  }

  const supabase = await createClient()
  let query = supabase
    .from('events')
    .select('*, game:games(*)')
    .eq('is_published', true)
    .order('start_at')

  const game = params.get('game')
  const start = params.get('start')
  const end = params.get('end')

  if (start) query = query.gte('start_at', start)
  if (end) query = query.lte('start_at', end)

  if (game && game !== 'all') {
    const slugs = game.split(',')
    const { data: games } = await supabase.from('games').select('id, slug').in('slug', slugs)
    if (games?.length) {
      query = query.in('game_id', games.map((g) => g.id))
    }
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const events = (data ?? []).map((row) => ({
    ...row,
    game: Array.isArray(row.game) ? row.game[0] : row.game,
  }))

  return NextResponse.json({ events })
}

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const admin = createAdminClient()
  const { data, error } = await admin.from('events').insert(body).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}
