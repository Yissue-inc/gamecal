'use client'

import { useState, useEffect } from 'react'
import { BADGE_DEFINITIONS } from '@/lib/engagement-store'
import { CalCharacter } from './CalCharacter'

export function BadgeUnlockModal() {
  const [badgeId, setBadgeId] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { badgeId: string }
      setBadgeId(detail.badgeId)
      setTimeout(() => setBadgeId(null), 4000)
    }
    window.addEventListener('cal:badge-unlocked', handler)
    return () => window.removeEventListener('cal:badge-unlocked', handler)
  }, [])

  if (!badgeId) return null

  const badge = BADGE_DEFINITIONS.find((b) => b.id === badgeId)
  if (!badge) return null

  return (
    <div
      data-testid="badge-unlock-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={() => setBadgeId(null)}
    >
      <div
        className="max-w-sm rounded-xl border border-amber-500/50 bg-zinc-900 p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CalCharacter mood="celebration" size="lg" className="mb-4 block" />
        <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Achievement Unlocked</p>
        <p data-testid="badge-unlock-name" className="mt-2 text-2xl font-bold text-white">
          {badge.icon} {badge.name}
        </p>
        <p className="mt-2 text-sm text-zinc-400">{badge.description}</p>
        <button
          type="button"
          data-testid="close-badge-modal"
          className="mt-6 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => setBadgeId(null)}
        >
          Close
        </button>
      </div>
    </div>
  )
}
