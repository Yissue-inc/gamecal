import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  format,
  isBefore,
  parseISO,
  differenceInHours,
} from 'date-fns'
import {
  detectBrowserTimezone,
  formatTimeInTimezone,
  formatTimeRangeInTimezone,
  isTodayInTimezone,
} from '@/lib/timezone'
import type {
  CalendarEvent,
  EventType,
  Game,
  GameEvent,
  Importance,
} from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getEventTypeLabel(type: EventType): string {
  const labels: Record<EventType, string> = {
    weekly_reset: 'Weekly Reset',
    season_start: 'Season Start',
    season_end: 'Season End',
    live_event: 'Live Event',
    limited_reward: 'Limited Reward',
    patch_release: 'Patch Release',
    tournament: 'Tournament',
    ranked_reset: 'Ranked Reset',
    banner_end: 'Banner End',
    double_xp: 'Double XP',
    maintenance: 'Maintenance',
    new_content: 'New Content',
    other: 'Other',
  }
  return labels[type] ?? type
}

export function getEventTypeIcon(type: EventType): string {
  const icons: Record<EventType, string> = {
    weekly_reset: '🔄',
    season_start: '🚀',
    season_end: '🏁',
    live_event: '🎉',
    limited_reward: '🎁',
    patch_release: '🔧',
    tournament: '🏆',
    ranked_reset: '📊',
    banner_end: '⏳',
    double_xp: '⚡',
    maintenance: '🛠',
    new_content: '✨',
    other: '📌',
  }
  return icons[type] ?? '📌'
}

/** @deprecated Use getEventTypeIcon */
export function getEventTypeEmoji(type: EventType): string {
  return getEventTypeIcon(type)
}

export function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    PS5: '#003087',
    Xbox: '#107c10',
    Switch: '#e4000f',
    PC: '#1b2838',
    Mobile: '#6366f1',
  }
  return colors[platform] ?? '#1a1a2e'
}

export function getReleaseHeroColor(platforms: string[]): string {
  if (platforms.length === 0) return '#1a1a2e'
  return getPlatformColor(platforms[0])
}

export function getImportanceColor(importance: Importance): string {
  const colors: Record<Importance, string> = {
    critical: '#ef4444',
    high: '#f97316',
    normal: '#6366f1',
    low: '#22c55e',
  }
  return colors[importance]
}

export function getImportanceEmoji(importance: Importance): string {
  const emojis: Record<Importance, string> = {
    critical: '🚨',
    high: '🔴',
    normal: '🟡',
    low: '🟢',
  }
  return emojis[importance]
}

export function formatEventDate(iso: string, tz = 'UTC'): string {
  const date = parseISO(iso)
  return `${format(date, 'MMM d, h:mm a')} ${tz}`
}

export function formatDateRange(start: string, end?: string): string {
  const startDate = parseISO(start)
  if (!end) return format(startDate, 'MMM d, yyyy')
  const endDate = parseISO(end)
  if (format(startDate, 'MMM yyyy') === format(endDate, 'MMM yyyy')) {
    if (format(startDate, 'd') === format(endDate, 'd')) {
      return format(startDate, 'MMM d, yyyy')
    }
    return `${format(startDate, 'MMM d')}–${format(endDate, 'd, yyyy')}`
  }
  return `${format(startDate, 'MMM d')}–${format(endDate, 'MMM d, yyyy')}`
}

export function formatTime(
  iso: string,
  timeFormat: '12h' | '24h' = '12h',
  timezone?: string
): string {
  const tz = timezone ?? detectBrowserTimezone()
  return formatTimeInTimezone(iso, tz, timeFormat)
}

export function formatTimeRange(
  start: string,
  end?: string,
  timeFormat: '12h' | '24h' = '12h',
  timezone?: string
): string {
  const tz = timezone ?? detectBrowserTimezone()
  return formatTimeRangeInTimezone(start, end, tz, timeFormat)
}

export function isEndingSoon(date: string, hours = 48): boolean {
  const target = parseISO(date)
  const now = new Date()
  if (isBefore(target, now)) return false
  return differenceInHours(target, now) <= hours
}

export function getGameTextColor(brandColor: string): string {
  const lightened: Record<string, string> = {
    '#00d4ff': '#00d4ff',
    '#e33c3c': '#ef8080',
    '#ff4655': '#ff8090',
    '#c89b3c': '#e6bb6a',
    '#4f91cd': '#7db3e0',
    '#b45309': '#d97706',
    '#f59e0b': '#fbbf24',
    '#eab308': '#fcd34d',
    '#4ade80': '#86efac',
  }
  return lightened[brandColor.toLowerCase()] ?? brandColor
}

const IMPORTANCE_ORDER: Record<Importance, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

export function getGamerCountdown(start: string, end?: string): string {
  const now = new Date()
  const startDate = parseISO(start)
  const endDate = end ? parseISO(end) : startDate

  if (isBefore(endDate, now) && isBefore(startDate, now)) {
    return `Ended · ${format(endDate, 'MMM d')}`
  }
  if (isBefore(startDate, now) && !isBefore(endDate, now)) {
    return '🔴 LIVE'
  }

  const diffMs = startDate.getTime() - now.getTime()
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)

  if (totalHours <= 24) {
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `Starts in ${totalHours}h ${mins}m`
  }
  if (days <= 7) {
    return `${days} day${days === 1 ? '' : 's'} left`
  }
  return `D-${days}`
}

export function getCountdown(date: string): string {
  return getGamerCountdown(date)
}

export function gameEventToCalendarEvent(event: GameEvent, game: Game): CalendarEvent {
  const color = game.brand_color
  const classNames = [`importance-${event.importance}`]
  if (event.importance === 'critical') classNames.push('critical-event')

  return {
    id: event.id,
    title: `${getEventTypeIcon(event.event_type)} ${event.title}`,
    start: event.start_at,
    end: event.end_at ?? undefined,
    backgroundColor: hexToRgba(color, 0.125),
    borderColor: color,
    textColor: getGameTextColor(color),
    classNames,
    extendedProps: {
      gameEvent: event,
      game,
      importanceOrder: IMPORTANCE_ORDER[event.importance],
    },
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function getDaysUntil(dateStr: string): number {
  const target = parseISO(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const targetDay = new Date(target)
  targetDay.setHours(0, 0, 0, 0)
  return Math.ceil((targetDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function isToday(dateStr: string, timezone?: string): boolean {
  if (timezone) return isTodayInTimezone(dateStr, timezone)
  const date = parseISO(dateStr)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export function verifyAdminSecret(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  const url = new URL(request.url)
  const querySecret = url.searchParams.get('secret')
  const headerSecret = request.headers.get('Authorization')?.replace('Bearer ', '')
  return querySecret === secret || headerSecret === secret
}

export function verifyCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  const adminSecret = process.env.ADMIN_SECRET
  if (!cronSecret && !adminSecret) return false
  const auth = request.headers.get('Authorization')?.replace('Bearer ', '')
  return auth === cronSecret || auth === adminSecret
}
