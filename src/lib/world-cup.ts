import type { Game, GameEvent } from '@/types'
import { getAppUrl } from '@/lib/app-url'
import { WORLD_CUP_SLUG } from '@/lib/world-cup-config'
export { WORLD_CUP_SLUG } from '@/lib/world-cup-config'

export const WORLD_CUP_GAME: Game = {
  id: 'world-cup-2026',
  slug: WORLD_CUP_SLUG,
  name: 'Summer Cup 2026',
  icon_url: '/mini-cup/assets/themes/hero-stadium.webp',
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
  goals1?: WorldCupGoal[]
  goals2?: WorldCupGoal[]
}

const DEFAULT_WORLD_CUP_DATA_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

export type WorldCupGoal = {
  name: string
  minute?: string
  penalty?: boolean
  ownGoal?: boolean
}

export type WorldCupTeamStanding = {
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export type WorldCupStandings = Record<string, WorldCupTeamStanding[]>

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
  const goals = [...(match.goals1 ?? []), ...(match.goals2 ?? [])]
  const scorers = goals.length
    ? ` Goals: ${goals.map((goal) => `${goal.name}${goal.minute ? ` ${goal.minute}'` : ''}${goal.penalty ? ' pen' : ''}`).join(', ')}.`
    : ''
  const venue = match.ground ? ` Venue: ${match.ground}.` : ''
  const group = match.group ? `${match.group} · ` : ''

  return {
    id: eventIdForMatch(match, index),
    game_id: WORLD_CUP_GAME.id,
    game: WORLD_CUP_GAME,
    title: `${team1} vs ${team2}`,
    description: `${group}${match.round ?? 'Summer Cup 2026 match'}.${venue}${score}${scorers}`.trim(),
    event_type: 'tournament',
    importance: match.round?.toLowerCase().includes('final') ? 'critical' : 'high',
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    is_recurring: false,
    source_url: 'https://github.com/openfootball/worldcup.json',
    image_url: '/mini-cup/assets/themes/hero-stadium.webp',
    reward_type: 'content',
    reward_summary: 'Summer Cup 2026 match',
    reward_rarity: 'time_limited',
    reward_score: 60,
    is_time_limited_reward: true,
    source_confidence: 'media',
    metadata: {
      round: match.round,
      group: match.group,
      venue: match.ground,
      team1,
      team2,
      score: match.score,
      goals1: match.goals1 ?? [],
      goals2: match.goals2 ?? [],
    },
    is_published: true,
    created_at: new Date().toISOString(),
  }
}

async function fetchWorldCupMatches(): Promise<OpenFootballMatch[]> {
  const source = process.env.WORLD_CUP_DATA_URL ?? process.env.MINI_CUP_DATA_URL ?? DEFAULT_WORLD_CUP_DATA_URL
  const headers = process.env.WORLD_CUP_API_KEY || process.env.MINI_CUP_API_KEY
    ? { Authorization: `Bearer ${process.env.WORLD_CUP_API_KEY ?? process.env.MINI_CUP_API_KEY}` }
    : undefined

  const response = await fetch(source, {
    next: { revalidate: 6 * 60 * 60 },
    headers,
  })

  if (!response.ok) throw new Error(`Summer Cup 2026 data failed: ${response.status}`)

  const data = await response.json()
  return Array.isArray(data?.matches) ? data.matches as OpenFootballMatch[] : []
}

function filterWorldCupEvents(events: GameEvent[], options: {
  start?: string | null
  end?: string | null
  limit?: number
} = {}) {
  const startMs = options.start ? new Date(options.start).getTime() : Number.NEGATIVE_INFINITY
  const endMs = options.end ? new Date(options.end).getTime() : Number.POSITIVE_INFINITY
  const limit = options.limit ?? 200

  return events
    .filter((event) => {
      const eventStart = new Date(event.start_at).getTime()
      return eventStart >= startMs && eventStart <= endMs
    })
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, limit)
}

export async function fetchWorldCupEvents(options: {
  start?: string | null
  end?: string | null
  limit?: number
} = {}): Promise<GameEvent[]> {
  const rawMatches = await fetchWorldCupMatches()
  return filterWorldCupEvents(rawMatches.map(matchToEvent), options)
}

function emptyStanding(team: string): WorldCupTeamStanding {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }
}

function addResult(
  standings: Map<string, WorldCupTeamStanding>,
  team: string,
  goalsFor: number,
  goalsAgainst: number
) {
  const row = standings.get(team) ?? emptyStanding(team)
  row.played += 1
  row.goalsFor += goalsFor
  row.goalsAgainst += goalsAgainst
  row.goalDifference = row.goalsFor - row.goalsAgainst
  if (goalsFor > goalsAgainst) {
    row.won += 1
    row.points += 3
  } else if (goalsFor === goalsAgainst) {
    row.drawn += 1
    row.points += 1
  } else {
    row.lost += 1
  }
  standings.set(team, row)
}

export async function fetchWorldCupStandings(): Promise<WorldCupStandings> {
  const rawMatches = await fetchWorldCupMatches()
  const grouped = new Map<string, Map<string, WorldCupTeamStanding>>()

  for (const match of rawMatches) {
    if (!match.group || !match.team1 || !match.team2 || !match.score?.ft) continue
    const group = grouped.get(match.group) ?? new Map<string, WorldCupTeamStanding>()
    addResult(group, match.team1, match.score.ft[0], match.score.ft[1])
    addResult(group, match.team2, match.score.ft[1], match.score.ft[0])
    grouped.set(match.group, group)
  }

  return Object.fromEntries(
    Array.from(grouped.entries()).map(([group, rows]) => [
      group,
      Array.from(rows.values()).sort((a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.team.localeCompare(b.team)
      ),
    ])
  )
}

export function getRoarUrl(): string {
  return `${getAppUrl()}/roar`
}
