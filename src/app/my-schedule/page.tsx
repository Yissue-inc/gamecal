'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalCharacter } from '@/components/engagement/CalCharacter'
import { EventDetailPanel } from '@/components/calendar/EventDetailPanel'
import { Button } from '@/components/ui/button'
import { getWishlistIds } from '@/lib/engagement-store'
import { getEventArtUrl, getEventFallbackDescription } from '@/lib/game-art'
import { isSupabaseConfigured } from '@/lib/mock-data'
import type { GameEvent } from '@/types'

export default function MySchedulePage() {
  const { user, isGuest, loading } = useAuth()
  const [wishlisted, setWishlisted] = useState<GameEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null)

  useEffect(() => {
    async function loadWishlist() {
      const localIds = getWishlistIds()

      async function loadLocalEvents(ids: string[]) {
        const start = new Date()
        start.setFullYear(start.getFullYear() - 1)
        const end = new Date()
        end.setFullYear(end.getFullYear() + 2)
        const params = new URLSearchParams({
          start: start.toISOString(),
          end: end.toISOString(),
        })
        const res = await fetch(`/api/events?${params}`)
        const data = await res.json()
        return (data.events ?? []).filter((event: GameEvent) => ids.includes(event.id))
      }

      if (!isSupabaseConfigured() || !user) {
        if (!localIds.length) {
          setWishlisted([])
          return
        }
        setWishlisted(await loadLocalEvents(localIds))
        return
      }

      const res = await fetch('/api/wishlist')
      const data = await res.json()
      const apiEvents = data.events ?? []
      const localEvents = localIds.length ? await loadLocalEvents(localIds) : []
      const merged = new Map<string, GameEvent>()
      for (const event of [...apiEvents, ...localEvents]) merged.set(event.id, event)
      setWishlisted(Array.from(merged.values()))
    }

    loadWishlist()
    window.addEventListener('cal:wishlist-changed', loadWishlist)
    return () => window.removeEventListener('cal:wishlist-changed', loadWishlist)
  }, [user])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f0f]" data-testid="my-schedule-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isGuest || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f0f0f] p-8 text-center" data-testid="my-schedule-page">
        <CalCharacter mood="alert" size="lg" />
        <p className="text-zinc-400">Sign in to view your wishlisted events.</p>
        <Link href="/" className="text-indigo-400 hover:underline">
          Back to calendar
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="my-schedule-page">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="font-rajdhani text-xl font-bold">
          Gamer<span className="text-primary">Clock</span>
        </Link>
        <h1 className="font-rajdhani mt-4 text-2xl font-semibold">My Wishlists</h1>
        <p className="mt-1 text-sm text-zinc-400">Events you wishlisted — CAL is watching them.</p>
      </header>
      <main className="mx-auto max-w-4xl space-y-4 px-6 py-8">
        <div className="flex items-center gap-3 rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-4">
          <CalCharacter mood="idle" />
          <p className="text-sm text-zinc-300">
            {wishlisted.length
              ? `${wishlisted.length} events on your wishlist.`
              : 'No wishlisted events yet. Heart an event to add it here.'}
          </p>
        </div>
        <div className="space-y-2">
          {wishlisted.map((event) => (
            <div
              key={event.id}
              data-testid={`wishlist-item-${event.id}`}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedEvent(event)}
              onKeyDown={(keyboardEvent) => {
                if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                  keyboardEvent.preventDefault()
                  setSelectedEvent(event)
                }
              }}
              className="grid w-full grid-cols-[80px_1fr] gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-left transition-colors hover:border-indigo-500/70 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <div
                className="h-20 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 bg-cover bg-center"
                style={{
                  backgroundImage: getEventArtUrl(event, event.game)
                    ? `linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.05)), url(${getEventArtUrl(event, event.game)})`
                    : `linear-gradient(135deg, ${event.game?.brand_color ?? '#6366f1'}66, #18181b)`,
                }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-xs font-medium" style={{ color: event.game?.brand_color }}>
                  {event.game?.name}
                </div>
                <div className="font-semibold text-white">{event.title}</div>
                {event.game && (
                  <div className="mt-1 line-clamp-2 text-xs text-zinc-500">
                    {getEventFallbackDescription(event, event.game)}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="text-xs text-zinc-500">{event.start_at.slice(0, 10)}</div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 border-zinc-700 px-3 text-xs"
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation()
                      setSelectedEvent(event)
                    }}
                  >
                    View event card
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <EventDetailPanel
        event={selectedEvent}
        game={selectedEvent?.game ?? null}
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  )
}
