import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { cleanRoarNumber, cleanRoarText, getRoarIdentity, isRoarSchemaMissing } from '@/lib/roar'

export const dynamic = 'force-dynamic'

async function getTotals(matchId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('roar_cheers')
    .select('team, taps, score_delta')
    .eq('match_id', matchId)

  if (error) {
    if (isRoarSchemaMissing(error)) return []
    throw error
  }

  const totals = new Map<string, { team: string; taps: number; score: number }>()
  for (const row of data ?? []) {
    const current = totals.get(row.team) ?? { team: row.team, taps: 0, score: 0 }
    current.taps += Number(row.taps) || 0
    current.score += Number(row.score_delta) || 0
    totals.set(row.team, current)
  }
  return Array.from(totals.values()).sort((a, b) => b.score - a.score || b.taps - a.taps)
}

export async function GET(request: NextRequest) {
  const matchId = cleanRoarText(request.nextUrl.searchParams.get('matchId'))
  if (!matchId) return NextResponse.json({ error: 'matchId is required' }, { status: 400 })
  if (!isSupabaseConfigured()) return NextResponse.json({ totals: [] })
  try {
    return NextResponse.json({ totals: await getTotals(matchId) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load cheer totals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const matchId = cleanRoarText(body.matchId)
  const matchTitle = cleanRoarText(body.matchTitle, 'World Cup match')
  const team = cleanRoarText(body.team)
  const taps = Math.min(500, cleanRoarNumber(body.taps, 1))
  const source = cleanRoarText(body.source, 'direct')

  if (!matchId || !matchTitle || !team) {
    return NextResponse.json({ error: 'matchId, matchTitle, and team are required' }, { status: 400 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      accepted: { matchId, matchTitle, team, taps, scoreDelta: taps },
      totals: [{ team, taps, score: taps }],
      identity: 'mock',
    })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const identity = getRoarIdentity(user, body.deviceId)
  if (!identity) {
    return NextResponse.json({ error: 'deviceId is required for guest cheers' }, { status: 400 })
  }

  const scoreDelta = taps
  const admin = createAdminClient()
  const { error } = await admin.from('roar_cheers').insert({
    user_id: identity.userId,
    device_id: identity.deviceId,
    match_id: matchId,
    match_title: matchTitle,
    team,
    taps,
    score_delta: scoreDelta,
    source,
  })

  if (error) {
    if (isRoarSchemaMissing(error)) {
      return NextResponse.json({
        accepted: { matchId, matchTitle, team, taps, scoreDelta },
        totals: [{ team, taps, score: scoreDelta }],
        identity: identity.identityType,
        persisted: false,
        migrationRequired: true,
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    accepted: { matchId, matchTitle, team, taps, scoreDelta },
    totals: await getTotals(matchId),
    identity: identity.identityType,
    persisted: true,
  })
}
