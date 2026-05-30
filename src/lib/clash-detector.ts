import type { GameEvent } from '@/types'

export interface ClashDay {
  date: string
  events: GameEvent[]
  gameCount: number
}

export function detectClashes(events: GameEvent[], daysAhead = 7): ClashDay[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() + daysAhead)

  const byDate: Record<string, GameEvent[]> = {}

  for (const event of events) {
    if (!['critical', 'high'].includes(event.importance)) continue

    const eventDate = new Date(event.start_at)
    const day = new Date(eventDate)
    day.setHours(0, 0, 0, 0)
    if (day < today || day > cutoff) continue

    const key = event.start_at.slice(0, 10)
    byDate[key] = [...(byDate[key] ?? []), event]
  }

  return Object.entries(byDate)
    .map(([date, dayEvents]) => {
      const gameCount = new Set(dayEvents.map((event) => event.game_id)).size
      return { date, events: dayEvents, gameCount }
    })
    .filter((day) => day.events.length >= 2 && day.gameCount >= 2)
    .sort((a, b) => a.date.localeCompare(b.date))
}
