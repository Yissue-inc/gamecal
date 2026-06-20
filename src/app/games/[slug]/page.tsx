import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured, MOCK_EVENTS, MOCK_GAMES } from '@/lib/mock-data'
import { fetchWorldCupEvents, WORLD_CUP_GAME, WORLD_CUP_SLUG } from '@/lib/world-cup'
import type { Game, GameEvent } from '@/types'
import { GameHubClient } from './GameHubClient'

export const dynamic = 'force-dynamic'

export default async function GameHubPage({ params }: { params: { slug: string } }) {
  let game: Game | null = null
  let events: GameEvent[] = []

  if (params.slug === WORLD_CUP_SLUG) {
    game = WORLD_CUP_GAME
    events = await fetchWorldCupEvents().catch(() => [])
    return <GameHubClient game={game} events={events} />
  }

  if (!isSupabaseConfigured()) {
    game = MOCK_GAMES.find((item) => item.slug === params.slug) ?? null
    events = MOCK_EVENTS.filter((event) => event.game?.slug === params.slug)
  } else {
    const supabase = await createClient()
    const { data: gameRow } = await supabase
      .from('games')
      .select('*')
      .eq('slug', params.slug)
      .single()

    game = gameRow

    if (game) {
      const now = new Date().toISOString()
      const { data } = await supabase
        .from('events')
        .select('*, game:games(*)')
        .eq('game_id', game.id)
        .eq('is_published', true)
        .or(`end_at.gte.${now},start_at.gte.${now}`)
        .order('start_at', { ascending: true })
        .limit(40)

      events = (data ?? []).map((row) => ({
        ...row,
        game: Array.isArray(row.game) ? row.game[0] : row.game,
      }))
    }
  }

  if (!game) notFound()

  return <GameHubClient game={game} events={events} />
}
