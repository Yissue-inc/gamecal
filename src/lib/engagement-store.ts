'use client'

const WISHLIST_KEY = 'gamecal-wishlist'
const RELEASE_WISHLIST_KEY = 'gamecal-release-wishlist'
const REMINDERS_KEY = 'gamecal-reminders'
const RELEASE_REMINDERS_KEY = 'gamecal-release-reminders'
const RECURRING_REMINDERS_KEY = 'gamecal-recurring-reminders'
const ATTENDANCE_KEY = 'gamecal-attendance'
const BADGES_KEY = 'gamecal-badges'
const GP_KEY = 'gamecal-gp'
const WEEKLY_GP_LOG_KEY = 'gamecal-weekly-gp-log'
const SHOP_STATE_KEY = 'gamecal-shop-state'
const GAME_AFFINITY_KEY = 'gamecal-game-affinity'
const PARTY_HISTORY_KEY = 'gamecal-party-history'
const EVENT_NOTES_KEY = 'gamecal-event-notes'

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

export interface WeeklyRecap {
  weekLabel: string
  eventsTracked: number
  currentStreak: number
  longestStreak: number
  gp: number
  prestige: { id: string; label: string; emoji: string }
  topGame?: string
  highPriorityThisWeek: number
}

export interface WeeklyGpEntry {
  id: string
  userId: string
  displayName: string
  gpAmount: number
  actionType: string
  weekStart: string
  createdAt: string
}

export interface LeaderboardRow {
  rank: number
  userId: string
  displayName: string
  totalGp: number
}

export interface ShopState {
  streakFreezeCount: number
  doubleGpUntil: string | null
  activeTheme: 'default' | 'neon' | 'gold'
  unlockedBadges: string[]
}

export interface ShopItem {
  id: string
  name: string
  description: string
  price: number
  icon: string
}

export const GP_SHOP_ITEMS: ShopItem[] = [
  {
    id: 'streak_freeze',
    name: 'Streak Freeze',
    description: 'Protects your streak if you miss one daily check-in.',
    price: 100,
    icon: '🧊',
  },
  {
    id: 'double_gp_day',
    name: 'Double GP Day',
    description: 'Doubles GP earned for the next 24 hours.',
    price: 200,
    icon: '⚡',
  },
  {
    id: 'theme_neon',
    name: 'Profile Theme - Neon',
    description: 'Turns your profile backdrop into an arcade neon panel.',
    price: 50,
    icon: '🌈',
  },
  {
    id: 'theme_gold',
    name: 'Profile Theme - Gold',
    description: 'Adds a premium gold finish to your profile.',
    price: 150,
    icon: '🏆',
  },
  {
    id: 'veteran_badge',
    name: 'Veteran Badge',
    description: 'Unlocks the limited Veteran profile badge.',
    price: 500,
    icon: '🎖',
  },
]

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

export function recordGameAffinityLocal(gameName: string): Record<string, number> {
  const key = gameName.trim()
  if (!key) return readJson<Record<string, number>>(GAME_AFFINITY_KEY, {})
  const counts = readJson<Record<string, number>>(GAME_AFFINITY_KEY, {})
  const next = { ...counts, [key]: (counts[key] ?? 0) + 1 }
  writeJson(GAME_AFFINITY_KEY, next)
  return next
}

export function getMayorTitlesLocal(): string[] {
  const counts = readJson<Record<string, number>>(GAME_AFFINITY_KEY, {})
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([game]) => `${game} Mayor 🏆`)
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

export function getRecurringReminderLocal(eventType: string): number | null {
  const all = readJson<Record<string, number>>(RECURRING_REMINDERS_KEY, {})
  return Number.isFinite(all[eventType]) ? all[eventType] : null
}

export function setRecurringReminderLocal(eventType: string, offsetMin: number | null): void {
  const all = readJson<Record<string, number>>(RECURRING_REMINDERS_KEY, {})
  if (offsetMin === null) {
    delete all[eventType]
  } else {
    all[eventType] = offsetMin
  }
  writeJson(RECURRING_REMINDERS_KEY, all)
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

export function getEventNote(eventId: string): string {
  const all = readJson<Record<string, string>>(EVENT_NOTES_KEY, {})
  return all[eventId] ?? ''
}

export function setEventNote(eventId: string, note: string): void {
  const all = readJson<Record<string, string>>(EVENT_NOTES_KEY, {})
  const next = note.trim().slice(0, 280)
  if (next) {
    all[eventId] = next
  } else {
    delete all[eventId]
  }
  writeJson(EVENT_NOTES_KEY, all)
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
        icon: '/icon-192.png',
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
  addGpLocal(2, 'daily_checkin')
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
  addGpLocal(5, 'badge_unlock')
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

export function getWeekStartUtc(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

function getLocalGpMultiplier(): number {
  const state = getShopStateLocal()
  return state.doubleGpUntil && new Date(state.doubleGpUntil).getTime() > Date.now() ? 2 : 1
}

function recordWeeklyGpLocal(amount: number, actionType: string) {
  const entries = readJson<WeeklyGpEntry[]>(WEEKLY_GP_LOG_KEY, [])
  const entry: WeeklyGpEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    userId: 'local-user',
    displayName: 'You',
    gpAmount: amount,
    actionType,
    weekStart: getWeekStartUtc(),
    createdAt: new Date().toISOString(),
  }
  writeJson(WEEKLY_GP_LOG_KEY, [entry, ...entries].slice(0, 500))
}

export function addGpLocal(amount: number, actionType = 'local_reward') {
  const awarded = amount * getLocalGpMultiplier()
  const previous = readJson<number>(GP_KEY, 0)
  const gp = previous + awarded
  writeJson(GP_KEY, gp)
  recordWeeklyGpLocal(awarded, actionType)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gamecal:gp-updated', { detail: { gp } }))
    for (const tier of [200, 500, 1000, 2500]) {
      if (previous < tier && gp >= tier) {
        window.dispatchEvent(new CustomEvent('gamecal:gp-milestone', { detail: { gp: tier } }))
      }
    }
  }
}

export function getGpLocal(): number {
  return readJson<number>(GP_KEY, 0)
}

export function getShopStateLocal(): ShopState {
  return readJson<ShopState>(SHOP_STATE_KEY, {
    streakFreezeCount: 0,
    doubleGpUntil: null,
    activeTheme: 'default',
    unlockedBadges: getBadgesLocal(),
  })
}

export function getWeeklyLeaderboardLocal(): LeaderboardRow[] {
  const weekStart = getWeekStartUtc()
  const weeklyTotal = readJson<WeeklyGpEntry[]>(WEEKLY_GP_LOG_KEY, [])
    .filter((entry) => entry.weekStart === weekStart)
    .reduce((sum, entry) => sum + entry.gpAmount, 0)

  return weeklyTotal > 0
    ? [{ rank: 1, userId: 'local-user', displayName: 'You', totalGp: weeklyTotal }]
    : []
}

export function getLocalWeeklyGp(): number {
  return getWeeklyLeaderboardLocal()[0]?.totalGp ?? 0
}

export function purchaseItemLocal(itemId: string): ShopState {
  const item = GP_SHOP_ITEMS.find((candidate) => candidate.id === itemId)
  if (!item) throw new Error('Unknown shop item')

  const currentGp = getGpLocal()
  if (currentGp < item.price) throw new Error('Not enough GP')

  const state = getShopStateLocal()
  const next: ShopState = { ...state, unlockedBadges: [...state.unlockedBadges] }

  if (itemId === 'streak_freeze') {
    next.streakFreezeCount += 1
  } else if (itemId === 'double_gp_day') {
    const base = Math.max(Date.now(), next.doubleGpUntil ? new Date(next.doubleGpUntil).getTime() : 0)
    next.doubleGpUntil = new Date(base + 24 * 60 * 60 * 1000).toISOString()
  } else if (itemId === 'theme_neon') {
    next.activeTheme = 'neon'
  } else if (itemId === 'theme_gold') {
    next.activeTheme = 'gold'
  } else if (itemId === 'veteran_badge' && !next.unlockedBadges.includes('veteran')) {
    next.unlockedBadges.push('veteran')
    const badges = getBadgesLocal()
    if (!badges.includes('veteran')) writeJson(BADGES_KEY, [...badges, 'veteran'])
  }

  writeJson(GP_KEY, currentGp - item.price)
  writeJson(SHOP_STATE_KEY, next)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gamecal:gp-updated', { detail: { gp: currentGp - item.price } }))
  }
  return next
}

export async function purchaseItem(itemId: string): Promise<{ gp: number; state: ShopState }> {
  const response = await fetch('/api/shop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error ?? 'Purchase failed')
  }

  return response.json()
}

export function getPrestigeLevel(gp: number): { id: string; label: string; emoji: string } {
  if (gp >= 2500) return { id: 'diamond', label: 'Legend', emoji: '💠' }
  if (gp >= 1000) return { id: 'platinum', label: 'Hardcore', emoji: '💎' }
  if (gp >= 500) return { id: 'gold', label: 'Dedicated', emoji: '🥇' }
  if (gp >= 200) return { id: 'silver', label: 'Regular', emoji: '🥈' }
  return { id: 'bronze', label: 'Casual', emoji: '🥉' }
}

export function buildWeeklyRecap(options?: {
  trackedGames?: string[]
  highPriorityThisWeek?: number
}): WeeklyRecap {
  const attendance = getAttendanceLocal()
  const gp = getGpLocal()
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const formatDay = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return {
    weekLabel: `${formatDay(weekStart)} - ${formatDay(weekEnd)}`,
    eventsTracked: getWishlistIds().length + getReleaseWishlistIds().length,
    currentStreak: attendance.currentStreak,
    longestStreak: attendance.longestStreak,
    gp,
    prestige: getPrestigeLevel(gp),
    topGame: options?.trackedGames?.[0],
    highPriorityThisWeek: options?.highPriorityThisWeek ?? 0,
  }
}

export const BADGE_DEFINITIONS = [
  { id: 'streak_3', name: 'First Timer', description: '3-day check-in streak', icon: '🔥', rarity: 'common' as const },
  { id: 'streak_7', name: 'Week Warrior', description: '7-day check-in streak', icon: '🏅', rarity: 'common' as const },
  { id: 'streak_30', name: 'Hardcore Regular', description: '30-day check-in streak', icon: '⚡', rarity: 'rare' as const },
  { id: 'streak_100', name: 'Centurion', description: '100-day check-in streak', icon: '🛡', rarity: 'epic' as const },
  { id: 'special_cal_whisperer', name: "CAL's Favorite", description: 'Added your first wishlist event', icon: '🤓', rarity: 'rare' as const },
  { id: 'special_sharer', name: 'Town Crier', description: 'Shared 10 events', icon: '📢', rarity: 'common' as const },
  { id: 'veteran', name: 'Veteran', description: 'Unlocked from the GP Shop', icon: '🎖', rarity: 'legendary' as const },
]
