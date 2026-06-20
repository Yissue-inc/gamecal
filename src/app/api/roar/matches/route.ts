import { NextRequest, NextResponse } from 'next/server'
import { fetchWorldCupEvents } from '@/lib/world-cup'

export const dynamic = 'force-dynamic'

function offsetTimeFromIso(iso: string) {
  const date = new Date(iso)
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${hours}:${minutes} UTC+0`
}

function matchStatus(startIso: string, endIso?: string) {
  const now = Date.now()
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : start + 2 * 60 * 60 * 1000
  if (now < start) return 'pre'
  if (now <= end) return 'live'
  return 'post'
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const matchId = params.get('matchId')
  const limit = Number(params.get('limit') ?? 200) || 200
  const now = Date.now()

  const events = await fetchWorldCupEvents({ limit: matchId ? Math.max(limit, 200) : limit }).catch(() => [])
  const matches = events.map((event) => {
    const metadata = event.metadata ?? {}
    const team1 = typeof metadata.team1 === 'string' ? metadata.team1 : event.title.split(' vs ')[0] || 'Team A'
    const team2 = typeof metadata.team2 === 'string' ? metadata.team2 : event.title.split(' vs ')[1] || 'Team B'
    const start = new Date(event.start_at)

    return {
      id: event.id,
      date: start.toISOString().slice(0, 10),
      time: offsetTimeFromIso(event.start_at),
      kickoffISO: event.start_at,
      status: matchStatus(event.start_at, event.end_at),
      round: typeof metadata.round === 'string' ? metadata.round : event.reward_summary ?? 'Summer Cup 2026 match',
      group: typeof metadata.group === 'string' ? metadata.group : undefined,
      team1,
      team2,
      ground: typeof metadata.venue === 'string' ? metadata.venue : undefined,
      venue: typeof metadata.venue === 'string' ? metadata.venue : undefined,
      score: metadata.score,
      events: [
        ...((Array.isArray(metadata.goals1) ? metadata.goals1 : []) as unknown[]).map((goal) => ({
          type: 'goal',
          team: team1,
          ...((goal && typeof goal === 'object') ? goal : {}),
        })),
        ...((Array.isArray(metadata.goals2) ? metadata.goals2 : []) as unknown[]).map((goal) => ({
          type: 'goal',
          team: team2,
          ...((goal && typeof goal === 'object') ? goal : {}),
        })),
      ],
      startAt: event.start_at,
      bettingClosesAt: event.start_at,
    }
  })

  const ordered = matchId
    ? [...matches].sort((a, b) => (a.id === matchId ? -1 : b.id === matchId ? 1 : new Date(a.startAt).getTime() - new Date(b.startAt).getTime()))
    : matches.sort((a, b) => {
        const aFuture = new Date(a.startAt).getTime() >= now ? 0 : 1
        const bFuture = new Date(b.startAt).getTime() >= now ? 0 : 1
        return aFuture - bFuture || new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      })

  return NextResponse.json({
    source: 'gamerclock-world-cup',
    realtime: false,
    fetchedAt: new Date().toISOString(),
    counts: {
      upcoming: matches.filter((match) => new Date(match.startAt).getTime() >= now).length,
      ended: matches.filter((match) => new Date(match.startAt).getTime() < now).length,
    },
    matches: ordered.slice(0, limit),
  })
}
