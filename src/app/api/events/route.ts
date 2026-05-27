import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { verifyAdminSecret } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ events: [] })
  }

  const supabase = await createClient()
  const isAdmin = verifyAdminSecret(request)
  let query = supabase
    .from('events')
    .select('*, game:games(*)')
    .order('start_at')

  if (!isAdmin) {
    query = query.eq('is_published', true)
  }

  const game = params.get('game')
  const start = params.get('start')
  const end = params.get('end')

  if (start) query = query.gte('start_at', start)
  if (end) query = query.lte('start_at', end)

  if (game && game !== 'all') {
    const slugs = game.split(',')
    const { data: games } = await supabase.from('games').select('id, slug').in('slug', slugs)
    if (games?.length) {
      query = query.in('game_id', games.map((g) => g.id))
    }
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const events = (data ?? []).map((row) => ({
    ...row,
    game: Array.isArray(row.game) ? row.game[0] : row.game,
  }))

  return NextResponse.json({ events })
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
