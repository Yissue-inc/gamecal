import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import {
  cleanMiniGameText,
  getMiniGameBySlug,
  getMiniGameIdentity,
  isMiniGameSchemaMissing,
} from '@/lib/minigames'

export const dynamic = 'force-dynamic'

/**
 * 세션은 게스트도 만들 수 있다. 저장이 불가능한 환경(Supabase 미설정,
 * 마이그레이션 이전)에서도 게임은 반드시 시작되어야 하므로 로컬 세션으로 폴백한다.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const miniGameSlug = cleanMiniGameText(body.miniGameSlug)
  if (!miniGameSlug || !getMiniGameBySlug(miniGameSlug)) {
    return NextResponse.json({ error: 'Unknown mini game' }, { status: 400 })
  }

  const eventId = cleanMiniGameText(body.eventId) || null
  const gameSlug = cleanMiniGameText(body.gameSlug) || null
  const source = cleanMiniGameText(body.source, 'direct')

  const localSession = {
    session: { id: `local_${miniGameSlug}`, miniGameSlug, eventId },
    identity: 'device' as const,
    persisted: false,
  }

  if (!isSupabaseConfigured()) return NextResponse.json(localSession)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const identity = getMiniGameIdentity(user?.id ?? null, body.deviceId)
  if (!identity) return NextResponse.json(localSession)

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('mini_game_sessions')
      .insert({
        user_id: identity.userId,
        device_id: identity.deviceId,
        mini_game_slug: miniGameSlug,
        event_id: eventId,
        game_slug: gameSlug,
        source,
      })
      .select('id, mini_game_slug, event_id')
      .single()

    if (error) {
      if (isMiniGameSchemaMissing(error)) return NextResponse.json(localSession)
      throw error
    }

    return NextResponse.json({
      session: { id: data.id, miniGameSlug: data.mini_game_slug, eventId: data.event_id },
      identity: identity.identityType,
      persisted: true,
    })
  } catch {
    // 세션 저장 실패가 플레이를 막아서는 안 된다.
    return NextResponse.json(localSession)
  }
}
