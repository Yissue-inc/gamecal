'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { GameEvent } from '@/types'
import { formatShortDate } from '@/lib/calendar-dates'

export function CommandSearch({
  events,
  onSelect,
}: {
  events: GameEvent[]
  onSelect: (event: GameEvent) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    const openHandler = () => setOpen(true)
    document.addEventListener('keydown', handler)
    window.addEventListener('gamecal:open-search', openHandler)
    return () => {
      document.removeEventListener('keydown', handler)
      window.removeEventListener('gamecal:open-search', openHandler)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = previousOverflow
      document.body.style.overflow = previousBodyOverflow
    }
  }, [open])

  const results = useMemo(() => {
    if (!query.trim()) return events.slice(0, 8)
    const q = query.toLowerCase()
    return events
      .filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.game?.name.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [events, query])

  if (!open) return null

  return (
    <div
      data-testid="command-search-overlay"
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-hidden bg-black/60 p-3 pt-20 md:p-4 md:pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl md:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2.5 md:px-4 md:py-3">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            data-testid="command-search-input"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events or games..."
            className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-zinc-600 md:text-sm"
          />
          <kbd className="rounded border border-zinc-700 px-1.5 text-[10px] text-zinc-500">ESC</kbd>
        </div>
        <ul className="max-h-[45vh] overflow-y-auto py-1.5 md:max-h-64 md:py-2">
          {results.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                data-testid={`search-result-${event.id}`}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-zinc-800 md:px-4"
                onClick={() => {
                  onSelect(event)
                  setOpen(false)
                  setQuery('')
                }}
              >
                <span className="text-lg">{event.game?.name[0]}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-white">{event.title}</div>
                  <div className="text-xs text-zinc-500">
                    {event.game?.name} · {formatShortDate(event.start_at)}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
