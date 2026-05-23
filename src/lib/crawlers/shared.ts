import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import type { GameEvent } from '@/types'

export async function upsertEvents(
  events: Partial<GameEvent>[],
  gameSlug: string
): Promise<{ inserted: number; updated: number }> {
  if (!isSupabaseConfigured()) {
    return { inserted: 0, updated: 0 }
  }

  const admin = createAdminClient()

  const { data: game } = await admin.from('games').select('id').eq('slug', gameSlug).single()
  if (!game) throw new Error(`Game not found: ${gameSlug}`)

  let inserted = 0
  let updated = 0

  for (const event of events) {
    const startDate = event.start_at?.split('T')[0]
    const { data: existing } = await admin
      .from('events')
      .select('id')
      .eq('game_id', game.id)
      .eq('title', event.title!)
      .gte('start_at', `${startDate}T00:00:00Z`)
      .lte('start_at', `${startDate}T23:59:59Z`)
      .maybeSingle()

    if (existing) {
      await admin.from('events').update({ ...event, game_id: game.id }).eq('id', existing.id)
      updated++
    } else {
      await admin.from('events').insert({ ...event, game_id: game.id, is_published: true })
      inserted++
    }
  }

  return { inserted, updated }
}
