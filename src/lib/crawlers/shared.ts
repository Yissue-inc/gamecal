import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { inferRewardSignals } from '@/lib/reward-signals'
import type { GameEvent } from '@/types'

const REWARD_COLUMNS = [
  'reward_type',
  'reward_summary',
  'reward_rarity',
  'reward_score',
  'is_time_limited_reward',
  'source_confidence',
] as const

function stripRewardColumns<T extends Record<string, unknown>>(payload: T): T {
  const next = { ...payload }
  for (const column of REWARD_COLUMNS) {
    delete next[column]
  }
  return next
}

function isMissingRewardColumnError(message?: string) {
  return Boolean(message && REWARD_COLUMNS.some((column) => message.includes(column)))
}

export async function upsertEvents(
  events: Partial<GameEvent>[],
  gameSlug: string
): Promise<{ inserted: number; updated: number; skipped: number }> {
  if (!isSupabaseConfigured()) {
    return { inserted: 0, updated: 0, skipped: events.length }
  }

  const admin = createAdminClient()

  const { data: game } = await admin.from('games').select('id').eq('slug', gameSlug).single()
  if (!game) throw new Error(`Game not found: ${gameSlug}`)

  let inserted = 0
  let updated = 0
  let skipped = 0
  const seen = new Set<string>()

  for (const event of events) {
    if (!event.title?.trim() || !event.start_at) {
      skipped++
      continue
    }

    const start = new Date(event.start_at)
    if (Number.isNaN(start.getTime())) {
      skipped++
      continue
    }

    const startDate = start.toISOString().split('T')[0]
    const dedupeKey = `${game.id}:${event.title.trim().toLowerCase()}:${startDate}`
    if (seen.has(dedupeKey)) {
      skipped++
      continue
    }
    seen.add(dedupeKey)

    const payload = {
      ...inferRewardSignals(event),
      ...event,
      title: event.title.trim(),
      game_id: game.id,
      is_published: true,
    }

    const { data: existing } = await admin
      .from('events')
      .select('id')
      .eq('game_id', game.id)
      .eq('title', payload.title)
      .gte('start_at', `${startDate}T00:00:00Z`)
      .lte('start_at', `${startDate}T23:59:59Z`)
      .maybeSingle()

    if (existing) {
      const { error } = await admin.from('events').update(payload).eq('id', existing.id)
      if (error && isMissingRewardColumnError(error.message)) {
        await admin.from('events').update(stripRewardColumns(payload)).eq('id', existing.id)
      } else if (error) {
        throw error
      }
      updated++
    } else {
      const { error } = await admin.from('events').insert(payload)
      if (error && isMissingRewardColumnError(error.message)) {
        await admin.from('events').insert(stripRewardColumns(payload))
      } else if (error) {
        throw error
      }
      inserted++
    }
  }

  return { inserted, updated, skipped }
}
