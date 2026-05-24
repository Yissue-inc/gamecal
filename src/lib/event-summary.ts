import type { EventType, GameEvent } from '@/types'

export interface EventTypeSummary {
  type: EventType
  icon: string
  label: string
  count: number
}

const EVENT_TYPE_META: Record<EventType, { icon: string; label: string; priority: number }> = {
  live_event: { icon: '🔴', label: 'Live', priority: 1 },
  tournament: { icon: '🏆', label: 'Cup', priority: 2 },
  season_end: { icon: '🏁', label: 'Season', priority: 3 },
  season_start: { icon: '🏁', label: 'Season', priority: 3 },
  limited_reward: { icon: '⭐', label: 'Limited', priority: 4 },
  patch_release: { icon: '📦', label: 'Patch', priority: 5 },
  new_content: { icon: '✨', label: 'New', priority: 5 },
  weekly_reset: { icon: '🔄', label: 'Reset', priority: 6 },
  ranked_reset: { icon: '📊', label: 'Ranked', priority: 6 },
  double_xp: { icon: '⚡', label: '2XP', priority: 7 },
  banner_end: { icon: '📢', label: 'Banner', priority: 7 },
  maintenance: { icon: '🔧', label: 'Maint', priority: 8 },
  other: { icon: '•', label: 'Other', priority: 9 },
}

export function getEventSummary(
  events: GameEvent[],
  gameId: string,
  maxShow = 4
): EventTypeSummary[] {
  const counts: Partial<Record<EventType, number>> = {}

  for (const e of events) {
    if (e.game_id !== gameId) continue
    counts[e.event_type] = (counts[e.event_type] ?? 0) + 1
  }

  return Object.entries(counts)
    .map(([type, count]) => ({
      type: type as EventType,
      icon: EVENT_TYPE_META[type as EventType]?.icon ?? '•',
      label: EVENT_TYPE_META[type as EventType]?.label ?? type,
      count: count!,
    }))
    .sort(
      (a, b) =>
        (EVENT_TYPE_META[a.type]?.priority ?? 99) -
        (EVENT_TYPE_META[b.type]?.priority ?? 99)
    )
    .slice(0, maxShow)
}
