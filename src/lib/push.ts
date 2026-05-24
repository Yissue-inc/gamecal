export {
  detectBrowserTimezone,
  formatTimezoneLabel,
  getTimezoneAbbreviation,
  formatTimeInTimezone,
  formatTimeRangeInTimezone,
  formatShortTimeInTimezone,
  isTodayInTimezone,
  formatDateKeyInTimezone,
} from '@/lib/timezone'

export function getTrackingCount(eventId: string): number {
  let hash = 0
  for (let i = 0; i < eventId.length; i++) {
    hash = (hash << 5) - hash + eventId.charCodeAt(i)
    hash |= 0
  }
  return 1200 + (Math.abs(hash) % 2800)
}

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch {
    // SW optional for MVP
  }
}
