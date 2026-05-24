'use client'

import { useState, useEffect } from 'react'
import { BADGE_DEFINITIONS, getBadgesLocal } from '@/lib/engagement-store'

const RARITY_BORDER: Record<string, string> = {
  common: 'border-zinc-600',
  rare: 'border-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]',
  epic: 'border-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.4)]',
  legendary: 'border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse',
}

export function BadgeGallery() {
  const [unlocked, setUnlocked] = useState<string[]>([])

  useEffect(() => {
    setUnlocked(getBadgesLocal())
    const refresh = () => setUnlocked(getBadgesLocal())
    window.addEventListener('cal:badge-unlocked', refresh)
    return () => window.removeEventListener('cal:badge-unlocked', refresh)
  }, [])

  return (
    <div data-testid="badge-gallery" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {BADGE_DEFINITIONS.map((badge) => {
        const isUnlocked = unlocked.includes(badge.id)
        return (
          <div
            key={badge.id}
            data-testid={`badge-${badge.id}`}
            data-unlocked={isUnlocked}
            className={`rounded-lg border p-4 text-center transition-all ${
              isUnlocked
                ? RARITY_BORDER[badge.rarity]
                : 'border-zinc-800 opacity-40 blur-[0.5px] grayscale'
            }`}
          >
            <div className="text-2xl">{badge.icon}</div>
            <div className="mt-2 text-xs font-bold text-white">{badge.name}</div>
            <div className="mt-1 text-[10px] text-zinc-500">{badge.description}</div>
          </div>
        )
      })}
    </div>
  )
}
