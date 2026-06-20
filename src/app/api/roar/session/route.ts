import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { cleanRoarText, getRoarIdentity, isRoarSchemaMissing } from '@/lib/roar'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const matchId = cleanRoarText(request.nextUrl.searchParams.get('matchId'))
  const deviceId = cleanRoarText(request.nextUrl.searchParams.get('deviceId')).slice(0, 120)

  if (!matchId) {
    return NextResponse.json({ error: 'matchId is required' }, { status: 400 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ session: null, identity: deviceId ? 'device' : 'guest' })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const identity = getRoarIdentity(user, deviceId)
  if (!identity) {
    return NextResponse.json({ session: null, identity: 'guest' })
  }

  const admin = createAdminClient()
  let query = admin.from('roar_sessions').select('*').eq('match_id', matchId).limit(1)
  query = identity.userId ? query.eq('user_id', identity.userId) : query.eq('device_id', identity.deviceId)
  const { data, error } = await query.maybeSingle()

  if (error) {
    if (isRoarSchemaMissing(error)) {
      return NextResponse.json({ session: null, identity: identity.identityType, migrationRequired: true })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ session: data ?? null, identity: identity.identityType })
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const matchId = cleanRoarText(body.matchId)
  const matchTitle = cleanRoarText(body.matchTitle, 'Summer Cup 2026 match')
  const teamSelected = cleanRoarText(body.teamSelected)
  const source = cleanRoarText(body.source, 'direct')

  if (!matchId || !matchTitle) {
    return NextResponse.json({ error: 'matchId and matchTitle are required' }, { status: 400 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      session: { match_id: matchId, match_title: matchTitle, team_selected: teamSelected || null },
      identity: 'mock',
    })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const identity = getRoarIdentity(user, body.deviceId)
  if (!identity) {
    return NextResponse.json({ error: 'deviceId is required for guest ROAR sessions' }, { status: 400 })
  }

  const admin = createAdminClient()
  const payload = {
    user_id: identity.userId,
    device_id: identity.deviceId,
    match_id: matchId,
    match_title: matchTitle,
    team_selected: teamSelected || null,
    source,
    last_seen_at: new Date().toISOString(),
  }

  let existingQuery = admin.from('roar_sessions').select('id').eq('match_id', matchId).limit(1)
  existingQuery = identity.userId
    ? existingQuery.eq('user_id', identity.userId)
    : existingQuery.eq('device_id', identity.deviceId)
  const { data: existing, error: existingError } = await existingQuery.maybeSingle()
  if (existingError) {
    if (isRoarSchemaMissing(existingError)) {
      return NextResponse.json({
        session: { match_id: matchId, match_title: matchTitle, team_selected: teamSelected || null },
        identity: identity.identityType,
        persisted: false,
        migrationRequired: true,
      })
    }
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  const mutation = existing?.id
    ? admin.from('roar_sessions').update(payload).eq('id', existing.id).select().single()
    : admin.from('roar_sessions').insert(payload).select().single()

  const { data, error } = await mutation

  if (error) {
    if (isRoarSchemaMissing(error)) {
      return NextResponse.json({
        session: { match_id: matchId, match_title: matchTitle, team_selected: teamSelected || null },
        identity: identity.identityType,
        persisted: false,
        migrationRequired: true,
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ session: data, identity: identity.identityType, persisted: true })
}
