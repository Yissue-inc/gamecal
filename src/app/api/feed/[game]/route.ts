import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MOCK_EVENTS, MOCK_GAMES, isSupabaseConfigured } from '@/lib/mock-data'
import { generateICS } from '@/lib/ical'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  const { game: gameSlug } = await params

  const VALID_SLUGS = ['fortnite', 'wow', 'pokemon-go', 'genshin', 'lol', 'all']

  if (!VALID_SLUGS.includes(gameSlug)) {
    return new NextResponse('Game not found', { status: 404 })
  }

  if (!isSupabaseConfigured()) {
    let events = MOCK_EVENTS
    if (gameSlug !== 'all') {
      events = events.filter((e) => e.game?.slug === gameSlug)
    }
    const game = MOCK_GAMES.find((g) => g.slug === gameSlug)
    const calName = gameSlug === 'all' ? 'GAMECAL — All Games' : `${game?.name ?? gameSlug} Events`
    const ics = generateICS(events, calName)
    return new NextResponse(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${gameSlug}.ics"`,
        'Cache-Control': 'public, s-maxage=3600',
      },
    })
  }

  const supabase = await createClient()
  let query = supabase.from('events').select('*, game:games(*)').eq('is_published', true)

  if (gameSlug !== 'all') {
    const { data: game } = await supabase.from('games').select('id, name').eq('slug', gameSlug).single()
    if (!game) return new NextResponse('Game not found', { status: 404 })
    query = query.eq('game_id', game.id)
  }

  const { data, error } = await query.order('start_at')
  if (error) return new NextResponse(error.message, { status: 500 })

  const events = (data ?? []).map((row) => ({
    ...row,
    game: Array.isArray(row.game) ? row.game[0] : row.game,
  }))

  const calName = gameSlug === 'all' ? 'GAMECAL — All Games' : `${gameSlug} Events`
  const ics = generateICS(events, calName)

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${gameSlug}.ics"`,
      'Cache-Control': 'public, s-maxage=3600',
    },
  })
}
