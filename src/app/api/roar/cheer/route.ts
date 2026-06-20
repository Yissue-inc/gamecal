import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { cleanRoarNumber, cleanRoarText, getRoarIdentity, isRoarSchemaMissing } from '@/lib/roar'

export const dynamic = 'force-dynamic'

async function getTotals(matchId: string) {
  const admin = createAdminClient()
  const { data: miniCupData, error: miniCupError } = await admin
    .from('mini_cup_cheer_totals')
    .select('match_id, country, taps, shakes, total, updated_at')
    .eq('match_id', matchId)
    .order('total', { ascending: false })

  if (!miniCupError) {
    return (miniCupData ?? []).map((row) => ({
      matchId: row.match_id,
      team: row.country,
      country: row.country,
      taps: Number(row.taps) || 0,
      shakes: Number(row.shakes) || 0,
      score: Number(row.total) || 0,
      total: Number(row.total) || 0,
      updatedAt: row.updated_at,
    }))
  }

  if (!isRoarSchemaMissing(miniCupError)) throw miniCupError

  const { data: cheerLogData, error: cheerLogError } = await admin
    .from('roar_cheers')
    .select('team, taps, score_delta')
    .eq('match_id', matchId)

  if (cheerLogError) {
    if (isRoarSchemaMissing(cheerLogError)) return []
    throw cheerLogError
  }

  const totals = new Map<string, { team: string; taps: number; score: number }>()
  for (const row of cheerLogData ?? []) {
    const current = totals.get(row.team) ?? { team: row.team, taps: 0, score: 0 }
    current.taps += Number(row.taps) || 0
    current.score += Number(row.score_delta) || 0
    totals.set(row.team, current)
  }
  return Array.from(totals.values())
    .sort((a, b) => b.score - a.score || b.taps - a.taps)
    .map((row) => ({
      ...row,
      country: row.team,
      total: row.score,
      shakes: Math.max(0, row.score - row.taps),
      updatedAt: new Date().toISOString(),
    }))
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
  const matchTitle = cleanRoarText(body.matchTitle, 'Summer Cup 2026 match')
  const team = cleanRoarText(body.team ?? body.country)
  const taps = Math.min(500, cleanRoarNumber(body.taps, 1))
  const shakes = Math.min(500, cleanRoarNumber(body.shakes, 0))
  const source = cleanRoarText(body.source, 'direct')

  if (!matchId || !matchTitle || !team) {
    return NextResponse.json({ error: 'matchId, matchTitle, and team are required' }, { status: 400 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      accepted: { matchId, matchTitle, team, country: team, taps, shakes, scoreDelta: taps + shakes },
      totals: [{ team, country: team, taps, shakes, score: taps + shakes, total: taps + shakes, updatedAt: new Date().toISOString() }],
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

  const scoreDelta = taps + shakes
  const admin = createAdminClient()
  const { error: miniCupError } = await admin.rpc('mini_cup_add_cheer', {
    p_match_id: matchId,
    p_country: team,
    p_taps: taps,
    p_shakes: shakes,
  })

  if (miniCupError && !isRoarSchemaMissing(miniCupError)) {
    return NextResponse.json({ error: miniCupError.message }, { status: 500 })
  }

  const { error: cheerLogError } = await admin.from('roar_cheers').insert({
    user_id: identity.userId,
    device_id: identity.deviceId,
    match_id: matchId,
    match_title: matchTitle,
    team,
    taps,
    score_delta: scoreDelta,
    source,
  })

  if (miniCupError && cheerLogError && isRoarSchemaMissing(cheerLogError)) {
    return NextResponse.json({
      accepted: { matchId, matchTitle, team, country: team, taps, shakes, scoreDelta },
      totals: [{ matchId, team, country: team, taps, shakes, score: scoreDelta, total: scoreDelta, updatedAt: new Date().toISOString() }],
      identity: identity.identityType,
      persisted: false,
      migrationRequired: true,
    })
  }

  if (cheerLogError && !isRoarSchemaMissing(cheerLogError)) {
    console.warn('ROAR cheer log insert failed', cheerLogError)
  }

  let totals = await getTotals(matchId)
  if (!totals.length) {
    totals = [{ matchId, team, country: team, taps, shakes, score: scoreDelta, total: scoreDelta, updatedAt: new Date().toISOString() }]
  }

  return NextResponse.json({
    accepted: { matchId, matchTitle, team, country: team, taps, shakes, scoreDelta },
    totals,
    identity: identity.identityType,
    persisted: !miniCupError,
  })
}
