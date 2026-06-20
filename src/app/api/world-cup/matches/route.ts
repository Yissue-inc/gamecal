import { NextResponse } from 'next/server'
import { fetchWorldCupEvents, fetchWorldCupStandings } from '@/lib/world-cup'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const [events, standings] = await Promise.all([
    fetchWorldCupEvents({
      start: url.searchParams.get('start'),
      end: url.searchParams.get('end'),
      limit: Number(url.searchParams.get('limit') ?? 200) || 200,
    }).catch(() => []),
    fetchWorldCupStandings().catch(() => ({})),
  ])

  return NextResponse.json({
    source: process.env.WORLD_CUP_DATA_URL ?? process.env.MINI_CUP_DATA_URL ?? 'openfootball',
    fetchedAt: new Date().toISOString(),
    count: events.length,
    standings,
    matches: events.map((event) => ({
      id: event.id,
      title: event.title,
      startAt: event.start_at,
      endAt: event.end_at,
      round: event.metadata?.round,
      group: event.metadata?.group,
      venue: event.metadata?.venue,
      score: event.metadata?.score,
      goals1: event.metadata?.goals1,
      goals2: event.metadata?.goals2,
      event,
    })),
  })
}
