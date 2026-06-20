import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured, MOCK_GAMES } from '@/lib/mock-data'
import { generateICS } from '@/lib/ical'
import { appendWorldCupGame, fetchWorldCupEvents, WORLD_CUP_GAME, WORLD_CUP_SLUG } from '@/lib/world-cup'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  const { game: gameSlug } = await params
  const includeWorldCup = gameSlug === 'all' || gameSlug === WORLD_CUP_SLUG

  if (!isSupabaseConfigured()) {
    if (gameSlug !== 'all' && !appendWorldCupGame(MOCK_GAMES).some((game) => game.slug === gameSlug)) {
      return new NextResponse('Game not found', { status: 404 })
    }

    const worldCupEvents = includeWorldCup ? await fetchWorldCupEvents().catch(() => []) : []
    const calName = gameSlug === 'all' ? 'GamerClock — All Games' : `${gameSlug} Events`
    const ics = generateICS(worldCupEvents, calName)
    return new NextResponse(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${gameSlug}.ics"`,
        'Cache-Control': 'public, s-maxage=3600',
      },
    })
  }

  const supabase = await createClient()

  // 'all' 이외의 슬러그는 DB에서 유효 여부를 동적으로 확인
  let gameId: string | null = null
  let gameName = gameSlug
  if (gameSlug !== 'all') {
    if (gameSlug === WORLD_CUP_SLUG) {
      gameName = WORLD_CUP_GAME.name
    } else {
      const { data: gameRow } = await supabase
        .from('games')
        .select('id, name')
        .eq('slug', gameSlug)
        .eq('is_active', true)
        .single()
      if (!gameRow) return new NextResponse('Game not found', { status: 404 })
      gameId = gameRow.id
      gameName = gameRow.name
    }
  }

  let query = supabase.from('events').select('*, game:games(*)').eq('is_published', true)
  const skipDbEvents = gameSlug === WORLD_CUP_SLUG

  if (gameId) {
    query = query.eq('game_id', gameId)
  }

  const { data, error } = skipDbEvents ? { data: [], error: null } : await query.order('start_at')
  if (error) return new NextResponse(error.message, { status: 500 })

  const dbEvents = (data ?? []).map((row) => ({
    ...row,
    game: Array.isArray(row.game) ? row.game[0] : row.game,
  }))
  const worldCupEvents = includeWorldCup ? await fetchWorldCupEvents().catch(() => []) : []
  const events = [...dbEvents, ...worldCupEvents].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  )

  const calName = gameSlug === 'all' ? 'GamerClock — All Games' : `${gameName} Events`
  const ics = generateICS(events, calName)

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${gameSlug}.ics"`,
      'Cache-Control': 'public, s-maxage=3600',
    },
  })
}
