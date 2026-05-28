import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/mock-data'

type PresenceKind = 'visit' | 'signed_in_visit' | 'checkin'

function emptyPresence() {
  const today = new Date().toISOString().slice(0, 10)
  return {
    day: today,
    visit_sessions: 0,
    signed_in_sessions: 0,
    checkins: 0,
    last_seen_at: null,
    updated_at: null,
  }
}

function isPresenceKind(value: unknown): value is PresenceKind {
  return value === 'visit' || value === 'signed_in_visit' || value === 'checkin'
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ presence: emptyPresence(), source: 'local' })
  }

  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('dragon_presence_daily')
    .select('*')
    .eq('day', today)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ presence: emptyPresence(), source: 'fallback', error: error.message }, { status: 200 })
  }

  return NextResponse.json({ presence: data ?? emptyPresence(), source: data ? 'supabase' : 'empty' })
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ presence: emptyPresence(), source: 'local' })
  }

  const body = await request.json().catch(() => ({}))
  const kind = isPresenceKind(body?.kind) ? body.kind : 'visit'
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('increment_dragon_presence_daily', { kind })

  if (error) {
    return NextResponse.json({ presence: emptyPresence(), source: 'fallback', error: error.message }, { status: 200 })
  }

  return NextResponse.json({ presence: data ?? emptyPresence(), source: 'supabase' })
}
