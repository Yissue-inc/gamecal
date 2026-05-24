'use client'

import { useEffect, useState } from 'react'
import { getGpLocal, getPrestigeLevel } from '@/lib/engagement-store'
import { useAuth } from '@/hooks/useAuth'

function gpProgress(gp: number): number {
  if (gp >= 2500) return 100
  if (gp >= 1000) return 40 + ((gp - 1000) / 1500) * 60
  if (gp >= 500) return 60 + ((gp - 500) / 500) * 20
  if (gp >= 200) return 20 + ((gp - 200) / 300) * 40
  return (gp / 200) * 20
}

export function PrestigeBar() {
  const { user, isGuest } = useAuth()
  const [gp, setGp] = useState(0)

  useEffect(() => {
    setGp(getGpLocal())
    const refresh = () => setGp(getGpLocal())
    window.addEventListener('storage', refresh)
    window.addEventListener('cal:badge-unlocked', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('cal:badge-unlocked', refresh)
    }
  }, [])

  if (isGuest || !user) return null

  const prestige = getPrestigeLevel(gp)
  const progress = gpProgress(gp)

  return (
    <div data-testid="prestige-bar" className="hidden items-center gap-2 lg:flex">
      <span className="text-xs">{prestige.emoji}</span>
      <div className="w-20 overflow-hidden rounded-full bg-zinc-800">
        <div
          data-testid="prestige-progress"
          className="h-1.5 rounded-full bg-indigo-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-[10px] text-zinc-500">{gp} GP</span>
    </div>
  )
}
