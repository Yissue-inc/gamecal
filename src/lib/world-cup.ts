import type { Game, GameEvent } from '@/types'
import { getAppUrl } from '@/lib/app-url'
import { WORLD_CUP_SLUG } from '@/lib/world-cup-config'
export { WORLD_CUP_SLUG } from '@/lib/world-cup-config'

export const WORLD_CUP_GAME: Game = {
  id: 'world-cup-2026',
  slug: WORLD_CUP_SLUG,
  name: 'World Cup',
  icon_url: '/world-cup-hero-stadium.png',
  brand_color: '#22c55e',
  platform: ['Global'],
  sort_order: 0,
}

type OpenFootballMatch = {
  round?: string
  date?: string
  time?: string
  team1?: string
  team2?: string
  group?: string
  ground?: string
  score?: { ft?: [number, number] }
}

const DEFAULT_WORLD_CUP_DATA_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

export function appendWorldCupGame(games: Game[]): Game[] {
  if (games.some((game) => game.slug === WORLD_CUP_SLUG)) return games
  return [WORLD_CUP_GAME, ...games].sort((a, b) => a.sort_order - b.sort_order)
}

function matchStartAt(match: OpenFootballMatch): Date {
  const date = match.date || '2026-06-11'
  if (!match.time) return new Date(`${date}T00:00:00Z`)

  const parsed = match.time.match(/^(\d{1,2}):(\d{2})\s+UTC([+-]\d{1,2})$/)
  if (!parsed) return new Date(`${date}T00:00:00Z`)

  const [, hour, minute, offset] = parsed
  const offsetNumber = Number(offset)
  const offsetText = `${offsetNumber >= 0 ? '+' : '-'}${String(Math.abs(offsetNumber)).padStart(2, '0')}:00`
  return new Date(`${date}T${hour.padStart(2, '0')}:${minute}:00${offsetText}`)
}

function eventIdForMatch(match: OpenFootballMatch, index: number): string {
  const raw = [
    match.date ?? 'unknown-date',
    match.team1 ?? 'team-a',
    match.team2 ?? 'team-b',
    index,
  ].join('-')
  return `world-cup-${raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
}

function matchToEvent(match: OpenFootballMatch, index: number): GameEvent {
  const start = matchStartAt(match)
  const end = new Date(start.getTime() + 2.25 * 60 * 60 * 1000)
  const team1 = match.team1 || 'Team A'
  const team2 = match.team2 || 'Team B'
  const score = match.score?.ft ? ` Final score: ${match.score.ft[0]}-${match.score.ft[1]}.` : ''
  const venue = match.ground ? ` Venue: ${match.ground}.` : ''
  const group = match.group ? `${match.group} · ` : ''

  return {
    id: eventIdForMatch(match, index),
    game_id: WORLD_CUP_GAME.id,
    game: WORLD_CUP_GAME,
    title: `${team1} vs ${team2}`,
    description: `${group}${match.round ?? 'World Cup match'}.${venue}${score}`.trim(),
    event_type: 'tournament',
    importance: match.round?.toLowerCase().includes('final') ? 'critical' : 'high',
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    is_recurring: false,
    source_url: 'https://github.com/openfootball/worldcup.json',
    image_url: '/world-cup-hero-stadium.png',
    reward_type: 'content',
    reward_summary: 'World Cup match',
    reward_rarity: 'time_limited',
    reward_score: 60,
    is_time_limited_reward: true,
    source_confidence: 'media',
    is_published: true,
    created_at: new Date().toISOString(),
  }
}

export async function fetchWorldCupEvents(options: {
  start?: string | null
  end?: string | null
  limit?: number
} = {}): Promise<GameEvent[]> {
  const source = process.env.WORLD_CUP_DATA_URL ?? process.env.MINI_CUP_DATA_URL ?? DEFAULT_WORLD_CUP_DATA_URL
  const headers = process.env.WORLD_CUP_API_KEY || process.env.MINI_CUP_API_KEY
    ? { Authorization: `Bearer ${process.env.WORLD_CUP_API_KEY ?? process.env.MINI_CUP_API_KEY}` }
    : undefined

  const response = await fetch(source, {
    next: { revalidate: 6 * 60 * 60 },
    headers,
  })

  if (!response.ok) throw new Error(`World Cup data failed: ${response.status}`)

  const data = await response.json()
  const rawMatches = Array.isArray(data?.matches) ? data.matches as OpenFootballMatch[] : []
  const startMs = options.start ? new Date(options.start).getTime() : Number.NEGATIVE_INFINITY
  const endMs = options.end ? new Date(options.end).getTime() : Number.POSITIVE_INFINITY
  const limit = options.limit ?? 200

  return rawMatches
    .map(matchToEvent)
    .filter((event) => {
      const eventStart = new Date(event.start_at).getTime()
      return eventStart >= startMs && eventStart <= endMs
    })
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, limit)
}

export function getRoarUrl(): string {
  return `${getAppUrl()}/roar`
}
