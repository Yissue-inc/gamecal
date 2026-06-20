import type { User } from '@supabase/supabase-js'

export type RoarIdentity = {
  userId: string | null
  deviceId: string | null
  identityType: 'user' | 'device'
}

export function cleanRoarText(value: unknown, fallback = ''): string {
  const text = typeof value === 'string' ? value : fallback
  return text.trim().slice(0, 180)
}

export function cleanRoarNumber(value: unknown, fallback = 0): number {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(0, Math.floor(number))
}

export function getRoarIdentity(user: User | null | undefined, deviceId: unknown): RoarIdentity | null {
  const cleanedDeviceId = cleanRoarText(deviceId).slice(0, 120) || null
  if (user?.id) {
    return {
      userId: user.id,
      deviceId: cleanedDeviceId,
      identityType: 'user',
    }
  }
  if (!cleanedDeviceId) return null
  return {
    userId: null,
    deviceId: cleanedDeviceId,
    identityType: 'device',
  }
}

export function weekStartUtc(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().slice(0, 10)
}
