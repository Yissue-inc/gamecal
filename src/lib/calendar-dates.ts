import { format, parseISO, isAfter, isBefore, addDays, startOfDay, differenceInDays } from 'date-fns'
import type { GameEvent } from '@/types'
import { formatDateKeyInTimezone, formatShortTimeInTimezone } from '@/lib/timezone'

export function isThisWeek(dateStr: string): boolean {
  const date = parseISO(dateStr)
  const now = new Date()
  const weekEnd = addDays(startOfDay(now), 7)
  return !isBefore(date, startOfDay(now)) && isBefore(date, weekEnd)
}

export function isWithinDays(dateStr: string, days: number): boolean {
  const date = parseISO(dateStr)
  const now = new Date()
  return !isBefore(date, startOfDay(now)) && !isAfter(date, addDays(now, days))
}

export function isUpcoming(dateStr: string): boolean {
  return isAfter(parseISO(dateStr), new Date())
}

export function isCurrentlyActive(event: GameEvent): boolean {
  const now = new Date()
  const start = parseISO(event.start_at)
  const end = parseISO(event.end_at ?? event.start_at)
  return !isBefore(now, start) && !isAfter(now, end)
}

export function getLiveEvents(events: GameEvent[]): GameEvent[] {
  return events.filter(isCurrentlyActive)
}

export function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d')
}

export function formatShortTime(
  dateStr: string,
  timezone?: string,
  timeFormat: '12h' | '24h' = '12h'
): string {
  const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  return formatShortTimeInTimezone(dateStr, tz, timeFormat)
}

export function getDday(dateStr: string): string {
  const days = differenceInDays(startOfDay(parseISO(dateStr)), startOfDay(new Date()))
  if (days === 0) return 'D-Day'
  if (days > 0) return `D-${days}`
  return `D+${Math.abs(days)}`
}

export function getTimeUntilEnd(endStr?: string): string {
  if (!endStr) return 'soon'
  const end = parseISO(endStr)
  const now = new Date()
  if (isBefore(end, now)) return 'ended'
  const hours = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60))
  if (hours < 1) return '<1h'
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function groupEventsByDay(
  events: GameEvent[],
  timezone?: string
): Record<string, GameEvent[]> {
  const groups: Record<string, GameEvent[]> = {}
  const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const todayKey = formatDateKeyInTimezone(new Date().toISOString(), tz)
  const tomorrowKey = formatDateKeyInTimezone(addDays(new Date(), 1).toISOString(), tz)

  for (const event of events) {
    const eventKey = formatDateKeyInTimezone(event.start_at, tz)
    let label: string
    if (eventKey === todayKey) label = 'TODAY'
    else if (eventKey === tomorrowKey) label = 'TOMORROW'
    else label = format(parseISO(event.start_at), 'MMM d').toUpperCase()

    if (!groups[label]) groups[label] = []
    groups[label].push(event)
  }
  return groups
}
