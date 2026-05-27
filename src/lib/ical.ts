import ical, { ICalAlarmType } from 'ical-generator'
import type { Game, GameEvent } from '@/types'
import { getEventTypeLabel } from '@/lib/utils'

export function generateICS(events: GameEvent[], calName: string): string {
  const calendar = ical({ name: calName, prodId: { company: 'GamerClock', product: 'Feed' } })

  for (const event of events) {
    addEventToCalendar(calendar, event, event.game)
  }

  return calendar.toString()
}

export function generateSingleEventICS(event: GameEvent, game: Game): string {
  const calendar = ical({
    name: `${game.name} — ${event.title}`,
    prodId: { company: 'GamerClock', product: 'Event' },
  })

  addEventToCalendar(calendar, event, game)
  return calendar.toString()
}

function addEventToCalendar(
  calendar: ReturnType<typeof ical>,
  event: GameEvent,
  game?: Game
) {
  const calEvent = calendar.createEvent({
    id: event.id,
    start: new Date(event.start_at),
    end: event.end_at ? new Date(event.end_at) : new Date(event.start_at),
    summary: `[${game?.name ?? 'GamerClock'}] ${event.title}`,
    description: [
      event.description,
      getEventTypeLabel(event.event_type),
      event.source_url ? `Source: ${event.source_url}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    url: event.source_url ?? undefined,
  })

  calEvent.createAlarm({
    type: ICalAlarmType.display,
    trigger: 24 * 60 * 60,
    description: `${event.title} starts in 24 hours`,
  })

  if (event.importance === 'critical') {
    calEvent.createAlarm({
      type: ICalAlarmType.display,
      trigger: 60 * 60,
      description: `${event.title} starts in 1 hour`,
    })
  }
}
