'use client'

import { useEffect, useState } from 'react'
import { isToday } from '@/lib/utils'

interface GuestBlurProps {
  onSignUp: () => void
}

export function GuestBanner({ onSignUp }: GuestBlurProps) {
  const [lockedCount, setLockedCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => {
        const hidden = (d.events ?? []).filter(
          (e: { start_at: string }) => !isToday(e.start_at)
        ).length
        setLockedCount(hidden)
      })
      .catch(() => setLockedCount(0))
  }, [])

  const countLabel = lockedCount === null ? '…' : lockedCount

  return (
    <div
      data-testid="blur-overlay"
      className="flex items-center justify-center gap-3 border-b border-indigo-900 bg-gradient-to-r from-indigo-950/80 to-purple-950/80 px-4 py-2 text-sm"
    >
      <span className="text-yellow-400" aria-hidden="true">🔒</span>
      <span className="text-zinc-300">
        <span data-testid="locked-event-count" className="font-semibold text-white">
          {countLabel} events hidden.
        </span>
        {' '}
        Sign in to unlock the full calendar.
        {' '}
        <span className="text-zinc-500">It&apos;s free — takes 10 seconds.</span>
      </span>
      <button
        type="button"
        data-testid="sign-in-free-button"
        onClick={onSignUp}
        className="ml-2 rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
      >
        Sign in free →
      </button>
    </div>
  )
}
