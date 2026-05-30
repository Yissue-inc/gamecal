'use client'

const WISHLIST_KEY = 'gamecal-wishlist'
const RELEASE_WISHLIST_KEY = 'gamecal-release-wishlist'
const REMINDERS_KEY = 'gamecal-reminders'
const RELEASE_REMINDERS_KEY = 'gamecal-release-reminders'
const ATTENDANCE_KEY = 'gamecal-attendance'
const BADGES_KEY = 'gamecal-badges'
const GP_KEY = 'gamecal-gp'
const PARTY_HISTORY_KEY = 'gamecal-party-history'

export interface AttendanceState {
  currentStreak: number
  longestStreak: number
  totalDays: number
  lastCheckIn: string | null
  checkedDates: string[]
}

export interface PartyHistoryItem {
  eventId: string
  eventTitle: string
  gameName: string
  url: string
  createdAt: string
  fallback?: boolean
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getWishlistIds(): string[] {
  return readJson<string[]>(WISHLIST_KEY, [])
}

export function toggleWishlistLocal(eventId: string): boolean {
  const ids = getWishlistIds()
  const next = ids.includes(eventId) ? ids.filter((id) => id !== eventId) : [...ids, eventId]
  writeJson(WISHLIST_KEY, next)
  if (next.includes(eventId)) {
    unlockBadgeLocal('special_cal_whisperer')
  }
  return next.includes(eventId)
}

export function setWishlistLocal(eventId: string, wishlisted: boolean): boolean {
  const ids = getWishlistIds()
  const next = wishlisted
    ? Array.from(new Set([...ids, eventId]))
    : ids.filter((id) => id !== eventId)
  writeJson(WISHLIST_KEY, next)
  if (wishlisted) {
    unlockBadgeLocal('special_cal_whisperer')
  }
  return wishlisted
}

export function isWishlistedLocal(eventId: string): boolean {
  return getWishlistIds().includes(eventId)
}

export function getReleaseWishlistIds(): string[] {
  return readJson<string[]>(RELEASE_WISHLIST_KEY, [])
}

export function toggleReleaseWishlistLocal(releaseId: string): boolean {
  const ids = getReleaseWishlistIds()
  const next = ids.includes(releaseId) ? ids.filter((id) => id !== releaseId) : [...ids, releaseId]
  writeJson(RELEASE_WISHLIST_KEY, next)
  if (next.includes(releaseId)) {
    unlockBadgeLocal('special_cal_whisperer')
  }
  return next.includes(releaseId)
}

export function setReleaseWishlistLocal(releaseId: string, wishlisted: boolean): boolean {
  const ids = getReleaseWishlistIds()
  const next = wishlisted
    ? Array.from(new Set([...ids, releaseId]))
    : ids.filter((id) => id !== releaseId)
  writeJson(RELEASE_WISHLIST_KEY, next)
  if (wishlisted) {
    unlockBadgeLocal('special_cal_whisperer')
  }
  return wishlisted
}

export function isReleaseWishlistedLocal(releaseId: string): boolean {
  return getReleaseWishlistIds().includes(releaseId)
}

export function getRemindersLocal(eventId: string): number[] {
  const all = readJson<Record<string, number[]>>(REMINDERS_KEY, {})
  return all[eventId] ?? []
}

export function toggleReminderLocal(eventId: string, offsetMin: number, eventStartAt: string): number[] {
  const all = readJson<Record<string, number[]>>(REMINDERS_KEY, {})
  const current = all[eventId] ?? []
  const next = current.includes(offsetMin)
    ? current.filter((o) => o !== offsetMin)
    : [...current, offsetMin]
  all[eventId] = next
  writeJson(REMINDERS_KEY, all)

  if (typeof window !== 'undefined' && next.includes(offsetMin)) {
    scheduleLocalReminder(eventId, offsetMin, eventStartAt)
  }
  return next
}

export function getReleaseRemindersLocal(releaseId: string): number[] {
  const all = readJson<Record<string, number[]>>(RELEASE_REMINDERS_KEY, {})
  return all[releaseId] ?? []
}

export function getPartyHistoryLocal(): PartyHistoryItem[] {
  return readJson<PartyHistoryItem[]>(PARTY_HISTORY_KEY, [])
}

export function addPartyHistoryLocal(item: PartyHistoryItem) {
  const current = getPartyHistoryLocal()
  const next = [
    item,
    ...current.filter((party) => party.url !== item.url && party.eventId !== item.eventId),
  ].slice(0, 12)
  writeJson(PARTY_HISTORY_KEY, next)
  addGpLocal(3)
  return next
}

export function toggleReleaseReminderLocal(releaseId: string, offsetMin: number, releaseAt: string): number[] {
  const all = readJson<Record<string, number[]>>(RELEASE_REMINDERS_KEY, {})
  const current = all[releaseId] ?? []
  const next = current.includes(offsetMin)
    ? current.filter((o) => o !== offsetMin)
    : [...current, offsetMin]
  all[releaseId] = next
  writeJson(RELEASE_REMINDERS_KEY, all)

  if (typeof window !== 'undefined' && next.includes(offsetMin)) {
    scheduleLocalReminder(releaseId, offsetMin, releaseAt)
  }
  return next
}

function scheduleLocalReminder(eventId: string, offsetMin: number, eventStartAt: string) {
  const remindAt = new Date(eventStartAt).getTime() - offsetMin * 60 * 1000
  const delay = remindAt - Date.now()
  if (delay <= 0 || delay > 7 * 24 * 60 * 60 * 1000) return

  setTimeout(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('CAL: Event starting soon', {
        body: "Don't be the one who missed it.",
        icon: '/og-image.svg',
      })
    }
  }, delay)
}

export function getAttendanceLocal(): AttendanceState {
  return readJson<AttendanceState>(ATTENDANCE_KEY, {
    currentStreak: 0,
    longestStreak: 0,
    totalDays: 0,
    lastCheckIn: null,
    checkedDates: [],
  })
}

export function checkInLocal(): AttendanceState {
  const today = new Date().toISOString().slice(0, 10)
  const state = getAttendanceLocal()
  if (state.checkedDates.includes(today)) return state

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)
  const continued = state.lastCheckIn === yesterdayStr

  const currentStreak = continued ? state.currentStreak + 1 : 1
  const next: AttendanceState = {
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    totalDays: state.totalDays + 1,
    lastCheckIn: today,
    checkedDates: [...state.checkedDates, today],
  }
  writeJson(ATTENDANCE_KEY, next)
  addGpLocal(2)
  checkBadgeUnlocks(next)
  return next
}

export function isCheckedInToday(): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return getAttendanceLocal().checkedDates.includes(today)
}

export function getBadgesLocal(): string[] {
  return readJson<string[]>(BADGES_KEY, [])
}

function unlockBadgeLocal(badgeId: string) {
  const badges = getBadgesLocal()
  if (badges.includes(badgeId)) return false
  writeJson(BADGES_KEY, [...badges, badgeId])
  addGpLocal(5)
  window.dispatchEvent(new CustomEvent('cal:badge-unlocked', { detail: { badgeId } }))
  return true
}

function checkBadgeUnlocks(attendance: AttendanceState) {
  const streak = attendance.currentStreak
  if (streak >= 3) unlockBadgeLocal('streak_3')
  if (streak >= 7) unlockBadgeLocal('streak_7')
  if (streak >= 30) unlockBadgeLocal('streak_30')
  const wishlistCount = getWishlistIds().length
  const releaseWishlistCount = getReleaseWishlistIds().length
  if (wishlistCount + releaseWishlistCount >= 1) unlockBadgeLocal('special_cal_whisperer')
}

export function addGpLocal(amount: number) {
  const gp = readJson<number>(GP_KEY, 0) + amount
  writeJson(GP_KEY, gp)
}

export function getGpLocal(): number {
  return readJson<number>(GP_KEY, 0)
}

export function getPrestigeLevel(gp: number): { id: string; label: string; emoji: string } {
  if (gp >= 2500) return { id: 'diamond', label: 'Legend', emoji: '💠' }
  if (gp >= 1000) return { id: 'platinum', label: 'Hardcore', emoji: '💎' }
  if (gp >= 500) return { id: 'gold', label: 'Dedicated', emoji: '🥇' }
  if (gp >= 200) return { id: 'silver', label: 'Regular', emoji: '🥈' }
  return { id: 'bronze', label: 'Casual', emoji: '🥉' }
}

export const BADGE_DEFINITIONS = [
  { id: 'streak_3', name: 'First Timer', description: '3-day check-in streak', icon: '🔥', rarity: 'common' as const },
  { id: 'streak_7', name: 'Week Warrior', description: '7-day check-in streak', icon: '🏅', rarity: 'common' as const },
  { id: 'streak_30', name: 'Hardcore Regular', description: '30-day check-in streak', icon: '⚡', rarity: 'rare' as const },
  { id: 'streak_100', name: 'Centurion', description: '100-day check-in streak', icon: '🛡', rarity: 'epic' as const },
  { id: 'special_cal_whisperer', name: "CAL's Favorite", description: 'Added your first wishlist event', icon: '🤓', rarity: 'rare' as const },
  { id: 'special_sharer', name: 'Town Crier', description: 'Shared 10 events', icon: '📢', rarity: 'common' as const },
]
