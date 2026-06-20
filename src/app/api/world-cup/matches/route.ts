import { NextResponse } from 'next/server'
import { fetchWorldCupEvents } from '@/lib/world-cup'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const events = await fetchWorldCupEvents({
    start: url.searchParams.get('start'),
    end: url.searchParams.get('end'),
    limit: Number(url.searchParams.get('limit') ?? 200) || 200,
  }).catch(() => [])

  return NextResponse.json({
    source: process.env.WORLD_CUP_DATA_URL ?? process.env.MINI_CUP_DATA_URL ?? 'openfootball',
    fetchedAt: new Date().toISOString(),
    count: events.length,
    matches: events.map((event) => ({
      id: event.id,
      title: event.title,
      startAt: event.start_at,
      endAt: event.end_at,
      round: event.description?.split('.')[0],
      venue: event.description?.match(/Venue: ([^.]+)/)?.[1],
      event,
    })),
  })
}
