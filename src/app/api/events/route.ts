import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { verifyAdminSecret } from '@/lib/utils'
import { getRewardSignals } from '@/lib/reward-signals'
import { fetchWorldCupEvents, WORLD_CUP_SLUG } from '@/lib/world-cup'

const PUBLIC_EVENTS_CACHE = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const game = params.get('game')
  const start = params.get('start')
  const end = params.get('end')
  const requestedSlugs = game && game !== 'all' ? game.split(',') : []
  const includeWorldCup = !game || game === 'all' || requestedSlugs.includes(WORLD_CUP_SLUG)
  const worldCupEventsPromise = includeWorldCup
    ? fetchWorldCupEvents({ start, end }).catch(() => [])
    : Promise.resolve([])

  if (!isSupabaseConfigured()) {
    const worldCupEvents = await worldCupEventsPromise
    return NextResponse.json({ events: worldCupEvents }, { headers: PUBLIC_EVENTS_CACHE })
  }

  const supabase = await createClient()
  const isAdmin = verifyAdminSecret(request)
  let skipDbEvents = false
  let query = supabase
    .from('events')
    .select('*, game:games(*)')
    .order('start_at')

  if (!isAdmin) {
    query = query.eq('is_published', true)
  }

  if (start) query = query.gte('start_at', start)
  if (end) query = query.lte('start_at', end)

  if (game && game !== 'all') {
    const dbSlugs = requestedSlugs.filter((slug) => slug !== WORLD_CUP_SLUG)
    if (!dbSlugs.length) {
      skipDbEvents = true
    } else {
      const { data: games } = await supabase.from('games').select('id, slug').in('slug', dbSlugs)
      if (games?.length) {
        query = query.in('game_id', games.map((g) => g.id))
      } else if (!includeWorldCup) {
        return NextResponse.json({ events: [] }, { headers: PUBLIC_EVENTS_CACHE })
      } else {
        skipDbEvents = true
      }
    }
  }

  const { data, error } = skipDbEvents ? { data: [], error: null } : await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const dbEvents = (data ?? []).map((row) => ({
    ...row,
    game: Array.isArray(row.game) ? row.game[0] : row.game,
  })).map((event) => ({
    ...event,
    ...getRewardSignals(event, event.game),
  }))

  const worldCupEvents = await worldCupEventsPromise
  const events = [...dbEvents, ...worldCupEvents].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  )

  return NextResponse.json(
    { events },
    { headers: isAdmin ? { 'Cache-Control': 'no-store' } : PUBLIC_EVENTS_CACHE }
  )
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
