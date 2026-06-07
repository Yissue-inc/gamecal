'use client'

import { useEffect, useMemo, useState } from 'react'
import type { GameEvent } from '@/types'
import { detectClashes } from '@/lib/clash-detector'
import { formatShortDate } from '@/lib/calendar-dates'
import { trackClashAlertAction } from '@/lib/posthog'

interface ClashAlertProps {
  events: GameEvent[]
  onEventClick: (event: GameEvent) => void
}

export function ClashAlert({ events, onEventClick }: ClashAlertProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [dismissedToday, setDismissedToday] = useState(false)
  const clashes = useMemo(() => detectClashes(events), [events])
  const clash = dismissedToday ? undefined : clashes[0]

  useEffect(() => {
    try {
      setDismissedToday(window.localStorage.getItem('gamerclock-dismissed-clashes') === today)
    } catch {
      setDismissedToday(false)
    }
  }, [today])

  if (!clash) return null

  const dateLabel = clash.date === today ? 'Today' : formatShortDate(`${clash.date}T00:00:00`)
  const games = Array.from(new Set(clash.events.map((event) => event.game?.name).filter(Boolean))).join(' · ')
  const dismissClash = () => {
    trackClashAlertAction('dismiss', {
      date: clash.date,
      event_count: clash.events.length,
      game_count: clash.gameCount,
    })
    setDismissedToday(true)
    try {
      window.localStorage.setItem('gamerclock-dismissed-clashes', today)
    } catch {
      // Non-persistent dismissal is still fine if storage is unavailable.
    }
  }

  return (
    <div
      data-testid="clash-alert"
      className="mx-3 mb-2 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2.5 md:mx-4"
    >
      <span className="shrink-0 text-lg" aria-hidden="true">⚠️</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-amber-300">
          Schedule clash on {dateLabel}
        </p>
        <p className="truncate text-[11px] text-zinc-400">
          {clash.gameCount} games · {games || `${clash.events.length} events`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            trackClashAlertAction('view', {
              date: clash.date,
              event_count: clash.events.length,
              game_count: clash.gameCount,
            })
            onEventClick(clash.events[0])
          }}
          className="rounded-md border border-amber-500/30 px-2 py-1 text-[11px] font-semibold text-amber-200 transition hover:border-amber-400/60 hover:text-amber-100"
        >
          View
        </button>
        <button
          type="button"
          onClick={dismissClash}
          className="rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 transition hover:text-zinc-300"
          aria-label="Dismiss clash alert"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
