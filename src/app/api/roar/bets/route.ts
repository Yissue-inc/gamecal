import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { cleanRoarNumber, cleanRoarText, getRoarIdentity, isRoarSchemaMissing } from '@/lib/roar'

export const dynamic = 'force-dynamic'

type BetStatus = 'open' | 'won' | 'lost'
type BetPick = 'team1' | 'draw' | 'team2'

const BET_STATUSES = new Set<BetStatus>(['open', 'won', 'lost'])
const BET_PICKS = new Set<BetPick>(['team1', 'draw', 'team2'])

function cleanBetPick(value: unknown): BetPick | null {
  const pick = cleanRoarText(value) as BetPick
  return BET_PICKS.has(pick) ? pick : null
}

function cleanBetStatus(value: unknown, fallback: BetStatus): BetStatus {
  const status = cleanRoarText(value) as BetStatus
  return BET_STATUSES.has(status) ? status : fallback
}

function cleanDate(value: unknown, fallback = new Date().toISOString()) {
  const text = cleanRoarText(value)
  if (!text) return fallback
  const time = Date.parse(text)
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback
}

function playerDeviceId(identity: { userId: string | null; deviceId: string | null }) {
  return identity.deviceId ?? (identity.userId ? `user:${identity.userId}` : null)
}

function mapBet(row: Record<string, unknown>) {
  return {
    id: row.id,
    matchId: row.match_id,
    matchLabel: row.match_label,
    country: row.country,
    pick: row.pick,
    pickLabel: row.pick_label,
    stake: Number(row.stake) || 0,
    potentialReturn: Number(row.potential_return) || 0,
    status: row.status,
    payout: Number(row.payout) || 0,
    claimed: Boolean(row.claimed),
    createdAt: row.created_at,
    settledAt: row.settled_at ?? undefined,
  }
}

async function getIdentity(request: NextRequest, deviceIdInput: unknown) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return getRoarIdentity(user, deviceIdInput ?? request.nextUrl.searchParams.get('deviceId'))
}

async function ensurePlayer(deviceId: string, userId: string | null, nickname?: string) {
  const admin = createAdminClient()
  return admin.from('mini_cup_players').upsert(
    {
      device_id: deviceId,
      user_id: userId,
      nickname: nickname || null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'device_id' },
  )
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ bets: [], localOnly: true })

  const identity = await getIdentity(request, request.nextUrl.searchParams.get('deviceId'))
  if (!identity) return NextResponse.json({ bets: [] })

  const deviceId = playerDeviceId(identity)
  if (!deviceId) return NextResponse.json({ bets: [] })

  const matchId = cleanRoarText(request.nextUrl.searchParams.get('matchId'))
  const admin = createAdminClient()
  let query = admin.from('mini_cup_bets').select('*').order('created_at', { ascending: false }).limit(50)

  if (identity.userId && identity.deviceId) {
    query = query.or(`user_id.eq.${identity.userId},device_id.eq.${identity.deviceId}`)
  } else if (identity.userId) {
    query = query.eq('user_id', identity.userId)
  } else {
    query = query.eq('device_id', deviceId)
  }

  if (matchId) query = query.eq('match_id', matchId)

  const { data, error } = await query
  if (error) {
    if (isRoarSchemaMissing(error)) return NextResponse.json({ bets: [], localOnly: true, migrationRequired: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ bets: (data ?? []).map((row) => mapBet(row as Record<string, unknown>)) })
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const pick = cleanBetPick(body.pick)
  const stake = cleanRoarNumber(body.stake)
  const matchId = cleanRoarText(body.matchId)
  const matchLabel = cleanRoarText(body.matchLabel)
  const country = cleanRoarText(body.country)
  const pickLabel = cleanRoarText(body.pickLabel, pick ?? '')

  if (!matchId || !matchLabel || !country || !pick || stake <= 0) {
    return NextResponse.json({ error: 'matchId, matchLabel, country, pick, and a positive stake are required' }, { status: 400 })
  }

  if (!isSupabaseConfigured()) return NextResponse.json({ bet: body, persisted: false, localOnly: true })

  const identity = await getIdentity(request, body.deviceId)
  if (!identity) return NextResponse.json({ error: 'deviceId is required for guest predictions' }, { status: 400 })

  const deviceId = playerDeviceId(identity)
  if (!deviceId) return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })

  const playerResult = await ensurePlayer(deviceId, identity.userId, cleanRoarText(body.nickname ?? body.playerName))
  if (playerResult.error) {
    if (isRoarSchemaMissing(playerResult.error)) return NextResponse.json({ bet: body, persisted: false, localOnly: true, migrationRequired: true })
    return NextResponse.json({ error: playerResult.error.message }, { status: 500 })
  }

  const potentialReturn = Math.max(stake, cleanRoarNumber(body.potentialReturn ?? body.potential_return, stake * 2))
  const status = cleanBetStatus(body.status, 'open')
  const payout = cleanRoarNumber(body.payout)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mini_cup_bets')
    .upsert(
      {
        id: cleanRoarText(body.id, `bet-${crypto.randomUUID()}`),
        device_id: deviceId,
        user_id: identity.userId,
        match_id: matchId,
        match_label: matchLabel,
        country,
        pick,
        pick_label: pickLabel,
        stake,
        potential_return: potentialReturn,
        status,
        payout,
        claimed: Boolean(body.claimed),
        created_at: cleanDate(body.createdAt),
        settled_at: body.settledAt ? cleanDate(body.settledAt) : null,
      },
      { onConflict: 'id' },
    )
    .select()
    .single()

  if (error) {
    if (isRoarSchemaMissing(error)) return NextResponse.json({ bet: body, persisted: false, localOnly: true, migrationRequired: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ bet: mapBet(data as Record<string, unknown>), identity: identity.identityType, persisted: true })
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const id = cleanRoarText(body.id)
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  if (!isSupabaseConfigured()) return NextResponse.json({ bet: body, persisted: false, localOnly: true })

  const identity = await getIdentity(request, body.deviceId)
  if (!identity) return NextResponse.json({ error: 'deviceId is required for guest predictions' }, { status: 400 })

  const deviceId = playerDeviceId(identity)
  if (!deviceId) return NextResponse.json({ error: 'deviceId is required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if ('status' in body) updates.status = cleanBetStatus(body.status, 'open')
  if ('payout' in body) updates.payout = cleanRoarNumber(body.payout)
  if ('claimed' in body) updates.claimed = Boolean(body.claimed)
  if ('settledAt' in body || updates.status === 'won' || updates.status === 'lost') {
    updates.settled_at = body.settledAt ? cleanDate(body.settledAt) : new Date().toISOString()
  }

  if (!Object.keys(updates).length) return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 })

  const admin = createAdminClient()
  let query = admin.from('mini_cup_bets').update(updates).eq('id', id)
  if (identity.userId && identity.deviceId) {
    query = query.or(`user_id.eq.${identity.userId},device_id.eq.${identity.deviceId}`)
  } else if (identity.userId) {
    query = query.eq('user_id', identity.userId)
  } else {
    query = query.eq('device_id', deviceId)
  }

  const { data, error } = await query.select().single()
  if (error) {
    if (isRoarSchemaMissing(error)) return NextResponse.json({ bet: body, persisted: false, localOnly: true, migrationRequired: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ bet: mapBet(data as Record<string, unknown>), identity: identity.identityType, persisted: true })
}
