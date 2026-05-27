import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import type { GameEvent } from '@/types'

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
      await admin.from('events').update(payload).eq('id', existing.id)
      updated++
    } else {
      await admin.from('events').insert(payload)
      inserted++
    }
  }

  return { inserted, updated, skipped }
}
