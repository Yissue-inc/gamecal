import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_PREFERENCES } from '@/types'

export const dynamic = 'force-dynamic'

const PREFERENCE_KEYS = [
  'timezone',
  'secondary_timezone',
  'timezone_label',
  'auto_timezone',
  'language',
  'date_format',
  'time_format',
  'week_starts_on',
  'show_weekends',
  'selected_games',
] as const

function sanitizePreferenceUpdates(body: Record<string, unknown>) {
  const updates: Record<string, unknown> = {}

  for (const key of PREFERENCE_KEYS) {
    if (key in body) updates[key] = body[key]
  }

  return updates
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    preferences: data ?? { id: user.id, ...DEFAULT_PREFERENCES },
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const updates = sanitizePreferenceUpdates(body)
  const payload: Record<string, unknown> = { id: user.id, ...updates, updated_at: new Date().toISOString() }

  let { data, error } = await supabase
    .from('user_preferences')
    .upsert(payload)
    .select()
    .single()

  if (error && 'auto_timezone' in updates && error.message.includes('auto_timezone')) {
    const { auto_timezone: _autoTimezone, ...compatiblePayload } = payload
    const retry = await supabase
      .from('user_preferences')
      .upsert(compatiblePayload)
      .select()
      .single()
    data = retry.data
    error = retry.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ preferences: data })
}
