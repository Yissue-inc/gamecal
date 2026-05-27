import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ reminders: [] })
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('reminders')
    .select('id,event_id,offset_min,remind_at,is_sent,created_at')
    .eq('user_id', user.id)
    .eq('is_sent', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reminders: data ?? [] })
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 })
  }

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId, offsetMin } = await request.json()
  if (!eventId || !Number.isFinite(Number(offsetMin))) {
    return NextResponse.json({ error: 'Invalid reminder payload' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: event, error: eventError } = await admin
    .from('events')
    .select('id,start_at')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: eventError?.message ?? 'Event not found' }, { status: 404 })
  }

  const remindAt = new Date(new Date(event.start_at).getTime() - Number(offsetMin) * 60 * 1000)
  if (Number.isNaN(remindAt.getTime())) {
    return NextResponse.json({ error: 'Invalid event start time' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('reminders')
    .upsert(
      {
        user_id: user.id,
        event_id: eventId,
        offset_min: Number(offsetMin),
        remind_at: remindAt.toISOString(),
        is_sent: false,
        sent_at: null,
        last_error: null,
      },
      { onConflict: 'user_id,event_id,offset_min' }
    )
    .select('id,event_id,offset_min,remind_at,is_sent,created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reminder: data })
}

export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ success: true })
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const eventId = params.get('event_id')
  const offsetMin = Number(params.get('offset_min'))
  if (!eventId || !Number.isFinite(offsetMin)) {
    return NextResponse.json({ error: 'Invalid reminder payload' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('reminders')
    .delete()
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .eq('offset_min', offsetMin)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
