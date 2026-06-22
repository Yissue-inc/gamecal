import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured, MOCK_EVENTS, MOCK_GAMES } from '@/lib/mock-data'
import { fetchWorldCupEvents, WORLD_CUP_GAME, WORLD_CUP_SLUG } from '@/lib/world-cup'
import type { Game, GameEvent } from '@/types'
import { GameHubClient } from './GameHubClient'

export const dynamic = 'force-dynamic'

async function getGame(slug: string): Promise<Game | null> {
  if (slug === WORLD_CUP_SLUG) return WORLD_CUP_GAME

  if (!isSupabaseConfigured()) {
    return MOCK_GAMES.find((item) => item.slug === slug) ?? null
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('games')
    .select('*')
    .eq('slug', slug)
    .single()

  return data as Game | null
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const game = await getGame(params.slug)
  if (!game) {
    return {
      title: 'Game Calendar | GamerClock',
      description: 'Track game events, release dates, resets, and reminders on GamerClock.',
    }
  }

  const title = `${game.name} Calendar, Events, Resets & Releases | GamerClock`
  const description =
    game.slug === WORLD_CUP_SLUG
      ? 'Follow Summer Cup 2026 fixtures, results, group standings, goal scorers, and ROAR match momentum on GamerClock.'
      : `Track ${game.name} events, resets, limited-time rewards, release dates, and reminders on GamerClock.`

  return {
    title,
    description,
    alternates: { canonical: `/games/${game.slug}` },
    openGraph: {
      title,
      description,
      url: `/games/${game.slug}`,
      images: [game.icon_url ?? '/og-image.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [game.icon_url ?? '/og-image.png'],
    },
  }
}

export default async function GameHubPage({ params }: { params: { slug: string } }) {
  let game: Game | null = null
  let events: GameEvent[] = []

  if (params.slug === WORLD_CUP_SLUG) {
    game = await getGame(params.slug)
    if (!game) notFound()
    events = await fetchWorldCupEvents().catch(() => [])
    return <GameHubClient game={game} events={events} />
  }

  if (!isSupabaseConfigured()) {
    game = await getGame(params.slug)
    events = MOCK_EVENTS.filter((event) => event.game?.slug === params.slug)
  } else {
    const supabase = await createClient()
    game = await getGame(params.slug)

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
