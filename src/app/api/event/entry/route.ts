import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const EVENT_ID = 'gamecal-level-up-launch-2026'

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ entry: null })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
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
  const { data: entry, error } = await admin
    .from('event_entries')
    .select('platform, social_url, score_at_entry, entered_at')
    .eq('user_id', user.id)
    .eq('event_id', event_id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entry: entry ?? null })
}
