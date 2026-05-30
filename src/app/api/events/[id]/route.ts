import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MOCK_EVENTS, isSupabaseConfigured } from '@/lib/mock-data'
import { verifyAdminSecret } from '@/lib/utils'
import { getRewardSignals } from '@/lib/reward-signals'

const PUBLIC_EVENT_CACHE = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const isAdmin = verifyAdminSecret(request)

  if (!isSupabaseConfigured()) {
    const event = MOCK_EVENTS.find((e) => e.id === id)
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ event }, { headers: PUBLIC_EVENT_CACHE })
  }

  const supabase = await createClient()
  let query = supabase
    .from('events')
    .select('*, game:games(*)')
    .eq('id', id)

  if (!isAdmin) {
    query = query.eq('is_published', true)
  }

  const { data, error } = await query
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  const event = { ...data, game: Array.isArray(data.game) ? data.game[0] : data.game }
  return NextResponse.json(
    { event: { ...event, ...getRewardSignals(event, event.game) } },
    { headers: isAdmin ? { 'Cache-Control': 'no-store' } : PUBLIC_EVENT_CACHE }
  )
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const admin = createAdminClient()
  const { data, error } = await admin.from('events').update(body).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('events').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
