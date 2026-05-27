import { parseISO } from 'date-fns'

export const COMMON_TIMEZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Sao_Paulo',
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
] as const

export function getCommonTimezones(current?: string): string[] {
  const detected = detectBrowserTimezone()
  return Array.from(new Set([detected, current, ...COMMON_TIMEZONES].filter(Boolean) as string[]))
}

export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function getTimezoneAbbreviation(timezone: string, date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(date)
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timezone.split('/').pop() ?? 'UTC'
  } catch {
    return 'UTC'
  }
}

export function formatTimezoneLabel(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? ''
    const abbr = getTimezoneAbbreviation(tz)
    return `${abbr} · ${offset}`
  } catch {
    return tz
  }
}

export function formatDateKeyInTimezone(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parseISO(iso))
}

export function isTodayInTimezone(iso: string, timezone: string): boolean {
  const now = new Date().toISOString()
  return formatDateKeyInTimezone(iso, timezone) === formatDateKeyInTimezone(now, timezone)
}

export function formatTimeInTimezone(
  iso: string,
  timezone: string,
  timeFormat: '12h' | '24h' = '12h'
): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
    timeZone: timezone,
  }).format(parseISO(iso))
}

export function formatTimeRangeInTimezone(
  start: string,
  end: string | undefined,
  timezone: string,
  timeFormat: '12h' | '24h' = '12h'
): string {
  const abbr = getTimezoneAbbreviation(timezone, parseISO(start))
  const startStr = formatTimeInTimezone(start, timezone, timeFormat)
  if (!end) return `${startStr} ${abbr}`
  const endStr = formatTimeInTimezone(end, timezone, timeFormat)
  return `${startStr} – ${endStr} ${abbr}`
}

export function formatShortTimeInTimezone(iso: string, timezone: string, timeFormat: '12h' | '24h' = '12h'): string {
  const time = formatTimeInTimezone(iso, timezone, timeFormat)
  const abbr = getTimezoneAbbreviation(timezone, parseISO(iso))
  return `${time} ${abbr}`
}
