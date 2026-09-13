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
import {
  encodeTrackScore,
  gameHasTracks,
  getMiniGameTrack,
  miniGameTrackScope,
  TRACK_SCOPE_PREFIX,
  trackIdFromScope,
  trackQuantiles,
  trackValueInBounds,
} from '@/lib/minigame-tracks'

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

/**
 * 종목(트랙)별 기록 분포 — 게임이 AI 결선 필드를 사람들의 실제 기록으로 뽑을 때 쓴다.
 * 개인 기록·아이디는 내보내지 않고 분위수와 인원만 준다. 5분 캐시.
 */
async function getTrackDistribution(miniGameSlug: string) {
  const empty = { tracks: {}, ready: false }
  if (!isSupabaseConfigured()) return empty
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mini_game_scores')
    .select('event_scope, stats')
    .eq('mini_game_slug', miniGameSlug)
    .like('event_scope', `${TRACK_SCOPE_PREFIX}%`)
    .limit(20000)
  if (error) {
    if (isMiniGameSchemaMissing(error)) return empty
    throw error
  }
  const byTrack = new Map<string, number[]>()
  for (const row of data ?? []) {
    const trackId = trackIdFromScope(String(row.event_scope ?? ''))
    const track = trackId ? getMiniGameTrack(miniGameSlug, trackId) : null
    const value = (row.stats as Record<string, unknown> | null)?.v
    // 범위표가 바뀐 뒤 옛 범위로 들어온 값은 분포에서 뺀다
    if (!trackId || !track || !trackValueInBounds(track, value)) continue
    const list = byTrack.get(trackId) ?? []
    list.push(value)
    byTrack.set(trackId, list)
  }
  const tracks: Record<string, { n: number; q: number[] }> = {}
  byTrack.forEach((values, trackId) => {
    tracks[trackId] = { n: values.length, q: trackQuantiles(values) }
  })
  return { tracks, ready: true }
}

export async function GET(request: NextRequest) {
  const miniGameSlug = cleanMiniGameText(request.nextUrl.searchParams.get('miniGameSlug'))
  if (!miniGameSlug || !getMiniGameBySlug(miniGameSlug)) {
    return NextResponse.json({ error: 'miniGameSlug is required' }, { status: 400 })
  }
  if (request.nextUrl.searchParams.get('dist') === 'all') {
    if (!gameHasTracks(miniGameSlug)) return NextResponse.json({ error: 'This game has no tracks' }, { status: 400 })
    try {
      const body = await getTrackDistribution(miniGameSlug)
      return NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } })
    } catch {
      return NextResponse.json({ tracks: {}, ready: false })
    }
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
  let eventScope = miniGameScopeKey(eventId)
  const gameSlug = cleanMiniGameText(body.gameSlug) || null
  const sessionId = cleanMiniGameText(body.sessionId)
  // 아이프레임 값은 서버가 자른다.
  let score = clampMiniGameScore(miniGameSlug, body.score)
  const rankLabel = cleanMiniGameText(body.rankLabel).slice(0, 40) || null
  const durationMs = Math.min(cleanMiniGameNumber(body.durationMs, 0), 24 * 60 * 60 * 1000)
  let stats = cleanMiniGameStats(body.stats)

  // 종목(트랙) 기록 — 소수·방향·단위가 종목마다 다르다. 범위 밖이면 저장하지 않는다.
  const trackId = cleanMiniGameText(body.track)
  if (trackId) {
    const track = getMiniGameTrack(miniGameSlug, trackId)
    if (!track) return NextResponse.json({ error: 'Unknown track' }, { status: 400 })
    const value = Number(body.value)
    if (!trackValueInBounds(track, value)) {
      return NextResponse.json({ error: 'Record is outside the plausible range' }, { status: 422 })
    }
    eventScope = miniGameTrackScope(trackId)
    score = clampMiniGameScore(miniGameSlug, encodeTrackScore(track, value))
    stats = { ...stats, v: value }
  }

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
