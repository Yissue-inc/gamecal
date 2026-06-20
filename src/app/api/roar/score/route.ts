import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { cleanRoarNumber, cleanRoarText, isRoarSchemaMissing, weekStartUtc } from '@/lib/roar'

export const dynamic = 'force-dynamic'

async function getLeaderboard(matchId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('roar_scores')
    .select('user_id, match_id, match_title, team, score, rank_label, updated_at')
    .eq('match_id', matchId)
    .order('score', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(20)

  if (error) {
    if (isRoarSchemaMissing(error)) return []
    throw error
  }

  return (data ?? []).map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    matchId: row.match_id,
    matchTitle: row.match_title,
    team: row.team,
    score: row.score,
    rankLabel: row.rank_label,
    updatedAt: row.updated_at,
  }))
}

export async function GET(request: NextRequest) {
  const matchId = cleanRoarText(request.nextUrl.searchParams.get('matchId'))
  if (!matchId) return NextResponse.json({ error: 'matchId is required' }, { status: 400 })
  if (!isSupabaseConfigured()) return NextResponse.json({ rows: [], me: null })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let rows
  try {
    rows = await getLeaderboard(matchId)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load leaderboard' }, { status: 500 })
  }
  const me = user ? rows.find((row) => row.userId === user.id) ?? null : null
  return NextResponse.json({ rows, me })
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({
      error: 'Sign in to save your ROAR score',
      authRequired: true,
    }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const matchId = cleanRoarText(body.matchId)
  const matchTitle = cleanRoarText(body.matchTitle, 'World Cup match')
  const team = cleanRoarText(body.team)
  const score = cleanRoarNumber(body.score)
  const rankLabel = cleanRoarText(body.rankLabel)

  if (!matchId || !matchTitle || !team) {
    return NextResponse.json({ error: 'matchId, matchTitle, and team are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('roar_scores')
    .upsert({
      user_id: user.id,
      match_id: matchId,
      match_title: matchTitle,
      team,
      score,
      rank_label: rankLabel || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,match_id' })
    .select()
    .single()

  if (error) {
    if (isRoarSchemaMissing(error)) {
      return NextResponse.json({
        error: 'ROAR persistence migration is required before scores can be saved',
        migrationRequired: true,
      }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { error: gpError } = await admin
    .from('weekly_gp_log')
    .insert({
      user_id: user.id,
      gp_amount: 3,
      action_type: 'roar_score_saved',
      week_start: weekStartUtc(),
    })

  return NextResponse.json({
    score: data,
    rows: await getLeaderboard(matchId),
    awardedGp: gpError ? 0 : 3,
  })
}
