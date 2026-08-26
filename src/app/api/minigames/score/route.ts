import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import {
  clampMiniGameScore,
  cleanMiniGameNumber,
  cleanMiniGameStats,
  cleanMiniGameText,
  getMiniGameBySlug,
  isMiniGameSchemaMissing,
  miniGameScopeKey,
} from '@/lib/minigames'

export const dynamic = 'force-dynamic'

type LeaderboardRow = {
  rank: number
  userId: string
  score: number
  rankLabel: string | null
  updatedAt: string
}

async function getLeaderboard(miniGameSlug: string, eventScope: string): Promise<LeaderboardRow[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mini_game_scores')
    .select('user_id, score, rank_label, updated_at')
    .eq('mini_game_slug', miniGameSlug)
    .eq('event_scope', eventScope)
    .order('score', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(20)

  if (error) {
    if (isMiniGameSchemaMissing(error)) return []
    throw error
  }

  return (data ?? []).map((row, index) => ({
    rank: index + 1,
    userId: row.user_id as string,
    score: row.score as number,
    rankLabel: (row.rank_label as string | null) ?? null,
    updatedAt: row.updated_at as string,
  }))
}

export async function GET(request: NextRequest) {
  const miniGameSlug = cleanMiniGameText(request.nextUrl.searchParams.get('miniGameSlug'))
  if (!miniGameSlug || !getMiniGameBySlug(miniGameSlug)) {
    return NextResponse.json({ error: 'miniGameSlug is required' }, { status: 400 })
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ rows: [], me: null })

  const eventScope = miniGameScopeKey(request.nextUrl.searchParams.get('eventId'))
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let rows: LeaderboardRow[]
  try {
    rows = await getLeaderboard(miniGameSlug, eventScope)
  } catch {
    return NextResponse.json({ rows: [], me: null })
  }
  const me = user ? rows.find((row) => row.userId === user.id) ?? null : null
  return NextResponse.json({ rows, me })
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Score saving is not available right now' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 게스트는 막지 않고 "저장하려면 로그인" 으로 안내한다 (핸드오프 §15)
  if (!user) {
    return NextResponse.json(
      { error: 'Sign in to save this mini-game score', authRequired: true },
      { status: 401 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const miniGameSlug = cleanMiniGameText(body.miniGameSlug)
  const game = getMiniGameBySlug(miniGameSlug)
  if (!game) return NextResponse.json({ error: 'Unknown mini game' }, { status: 400 })

  const eventId = cleanMiniGameText(body.eventId) || null
  const eventScope = miniGameScopeKey(eventId)
  const gameSlug = cleanMiniGameText(body.gameSlug) || null
  const sessionId = cleanMiniGameText(body.sessionId)
  // 아이프레임 값은 서버가 자른다.
  const score = clampMiniGameScore(miniGameSlug, body.score)
  const rankLabel = cleanMiniGameText(body.rankLabel).slice(0, 40) || null
  const durationMs = Math.min(cleanMiniGameNumber(body.durationMs, 0), 24 * 60 * 60 * 1000)
  const stats = cleanMiniGameStats(body.stats)

  try {
    const admin = createAdminClient()
    const { data: existing } = await admin
      .from('mini_game_scores')
      .select('id, score')
      .eq('user_id', user.id)
      .eq('mini_game_slug', miniGameSlug)
      .eq('event_scope', eventScope)
      .maybeSingle()

    // 더 나쁜 기록으로 개인 최고를 덮지 않는다.
    const keepExisting =
      existing && game.score.higherIsBetter
        ? (existing.score as number) >= score
        : existing
          ? (existing.score as number) <= score
          : false

    if (!keepExisting) {
      const { error } = await admin.from('mini_game_scores').upsert(
        {
          user_id: user.id,
          session_id: sessionId && !sessionId.startsWith('local_') ? sessionId : null,
          mini_game_slug: miniGameSlug,
          event_id: eventId,
          event_scope: eventScope,
          game_slug: gameSlug,
          score,
          rank_label: rankLabel,
          duration_ms: durationMs,
          stats,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,mini_game_slug,event_scope' },
      )
      if (error) {
        if (isMiniGameSchemaMissing(error)) {
          return NextResponse.json(
            { error: 'Score saving is not set up yet', schemaMissing: true },
            { status: 503 },
          )
        }
        throw error
      }
    }

    const leaderboard = await getLeaderboard(miniGameSlug, eventScope)
    const best = keepExisting ? (existing?.score as number) : score
    return NextResponse.json({
      score: { score: best, rankLabel, isPersonalBest: !keepExisting },
      leaderboard,
      awardedGp: 0,
    })
  } catch {
    return NextResponse.json({ error: 'Could not save your score' }, { status: 500 })
  }
}
