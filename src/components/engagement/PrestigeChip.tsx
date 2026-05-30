'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getGpLocal, getPrestigeLevel } from '@/lib/engagement-store'
import { useAuth } from '@/hooks/useAuth'

const TIERS = [0, 200, 500, 1000, 2500]

function getTierProgress(gp: number) {
  const nextTier = TIERS.find((tier) => tier > gp) ?? 2500
  const prevTier = [...TIERS].reverse().find((tier) => tier <= gp) ?? 0
  if (nextTier === prevTier) return 100
  return Math.min(100, Math.max(0, Math.round(((gp - prevTier) / (nextTier - prevTier)) * 100)))
}

export function PrestigeChip() {
  const { user, isGuest } = useAuth()
  const [gp, setGp] = useState(0)

  useEffect(() => {
    const refresh = () => setGp(getGpLocal())
    refresh()

    window.addEventListener('storage', refresh)
    window.addEventListener('cal:badge-unlocked', refresh)
    window.addEventListener('gamecal:checkin', refresh)
    window.addEventListener('gamecal:gp-updated', refresh)

    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('cal:badge-unlocked', refresh)
      window.removeEventListener('gamecal:checkin', refresh)
      window.removeEventListener('gamecal:gp-updated', refresh)
    }
  }, [])

  if (isGuest || !user) return null

  const prestige = getPrestigeLevel(gp)
  const progress = getTierProgress(gp)

  return (
    <Link
      href="/profile"
      data-testid="prestige-chip"
      className="group hidden h-8 items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/80 px-2.5 text-xs font-semibold text-zinc-300 transition hover:border-indigo-500/70 hover:bg-zinc-900 lg:flex"
      title={`${gp} GP - ${prestige.label}`}
    >
      <span aria-hidden="true">{prestige.emoji}</span>
      <span className="text-zinc-400">{prestige.label}</span>
      <span className="font-mono text-zinc-100">{gp} GP</span>
      <span className="h-1 w-12 overflow-hidden rounded-full bg-zinc-800">
        <span
          className="block h-full rounded-full bg-indigo-500 transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </span>
    </Link>
  )
}
