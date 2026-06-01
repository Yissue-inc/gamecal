import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { verifyAdminSecret } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const EVENT_ID = 'gamecal-level-up-launch-2026'

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ entries: [] })
  }

  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event_id = request.nextUrl.searchParams.get('event_id')
  if (!event_id) {
    return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
  }
  if (event_id !== EVENT_ID) {
    return NextResponse.json({ error: 'Unsupported event_id' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: entries, error } = await admin
    .from('event_entries')
    .select('id, user_id, email, platform, social_url, score_at_entry, event_id, entered_at')
    .eq('event_id', event_id)
    .order('entered_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entries: entries ?? [] })
}
