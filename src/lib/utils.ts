import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  format,
  formatDistanceToNowStrict,
  isBefore,
  parseISO,
  differenceInHours,
} from 'date-fns'
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

export function getEventTypeEmoji(type: EventType): string {
  const emojis: Record<EventType, string> = {
    weekly_reset: '🔄',
    season_start: '🎬',
    season_end: '🏁',
    live_event: '🎉',
    limited_reward: '🔴',
    patch_release: '🔧',
    tournament: '🏆',
    ranked_reset: '⚔️',
    banner_end: '🎴',
    double_xp: '✨',
    maintenance: '🔧',
    new_content: '🆕',
    other: '📌',
  }
  return emojis[type] ?? '📌'
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

export function formatTime(iso: string, timeFormat: '12h' | '24h' = '12h'): string {
  const date = parseISO(iso)
  return format(date, timeFormat === '24h' ? 'HH:mm' : 'h:mm a')
}

export function formatTimeRange(
  start: string,
  end?: string,
  timeFormat: '12h' | '24h' = '12h'
): string {
  const fmt = timeFormat === '24h' ? 'HH:mm' : 'h:mm a'
  const startStr = format(parseISO(start), fmt)
  if (!end) return `${startStr} UTC`
  const endStr = format(parseISO(end), fmt)
  return `${startStr} – ${endStr} UTC`
}

export function isEndingSoon(date: string, hours = 48): boolean {
  const target = parseISO(date)
  const now = new Date()
  if (isBefore(target, now)) return false
  return differenceInHours(target, now) <= hours
}

export function getCountdown(date: string): string {
  const target = parseISO(date)
  const now = new Date()
  if (isBefore(target, now)) return 'Ended'
  return formatDistanceToNowStrict(target, { addSuffix: false })
    .replace(' seconds', 's')
    .replace(' second', 's')
    .replace(' minutes', 'm')
    .replace(' minute', 'm')
    .replace(' hours', 'h')
    .replace(' hour', 'h')
    .replace(' days', 'd')
    .replace(' day', 'd')
}

export function gameEventToCalendarEvent(event: GameEvent, game: Game): CalendarEvent {
  const color = game.brand_color
  return {
    id: event.id,
    title: event.title,
    start: event.start_at,
    end: event.end_at ?? undefined,
    backgroundColor: `${color}33`,
    borderColor: color,
    textColor: '#ffffff',
    extendedProps: { gameEvent: event, game },
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

export function isToday(dateStr: string): boolean {
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
