import { format, parseISO, isAfter, isBefore, addDays, startOfDay, differenceInDays } from 'date-fns'
import type { GameEvent } from '@/types'

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

export function formatShortTime(dateStr: string, tz?: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeZoneName: 'short',
  }).format(parseISO(dateStr))
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

export function groupEventsByDay(events: GameEvent[]): Record<string, GameEvent[]> {
  const groups: Record<string, GameEvent[]> = {}
  const today = startOfDay(new Date())
  const tomorrow = addDays(today, 1)

  for (const event of events) {
    const day = startOfDay(parseISO(event.start_at))
    let label: string
    if (day.getTime() === today.getTime()) label = 'TODAY'
    else if (day.getTime() === tomorrow.getTime()) label = 'TOMORROW'
    else label = format(day, 'MMM d').toUpperCase()

    if (!groups[label]) groups[label] = []
    groups[label].push(event)
  }
  return groups
}
