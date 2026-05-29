'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalCharacter } from '@/components/engagement/CalCharacter'
import { EventDetailPanel } from '@/components/calendar/EventDetailPanel'
import { ReleaseDetailPanel } from '@/components/calendar/ReleaseDetailPanel'
import { Button } from '@/components/ui/button'
import { getReleaseHeroColor } from '@/lib/utils'
import { getReleaseWishlistIds, getWishlistIds } from '@/lib/engagement-store'
import { getEventArtUrl, getEventFallbackDescription } from '@/lib/game-art'
import { isSupabaseConfigured } from '@/lib/mock-data'
import type { GameEvent, NewRelease } from '@/types'

export default function MySchedulePage() {
  const { user, isGuest, loading } = useAuth()
  const [wishlisted, setWishlisted] = useState<GameEvent[]>([])
  const [wishlistedReleases, setWishlistedReleases] = useState<NewRelease[]>([])
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null)
  const [selectedRelease, setSelectedRelease] = useState<NewRelease | null>(null)

  useEffect(() => {
    async function loadWishlist() {
      const localIds = getWishlistIds()
      const localReleaseIds = getReleaseWishlistIds()

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

      async function loadLocalReleases(ids: string[]) {
        const res = await fetch('/api/new-releases')
        const data = await res.json()
        return (data.releases ?? []).filter((release: NewRelease) => ids.includes(release.id))
      }

      if (!isSupabaseConfigured() || !user) {
        if (!localIds.length && !localReleaseIds.length) {
          setWishlisted([])
          setWishlistedReleases([])
          return
        }
        setWishlisted(await loadLocalEvents(localIds))
        setWishlistedReleases(await loadLocalReleases(localReleaseIds))
        return
      }

      const [eventRes, releaseRes] = await Promise.all([
        fetch('/api/wishlist'),
        fetch('/api/release-wishlist'),
      ])
      const eventData = await eventRes.json()
      const releaseData = releaseRes.ok ? await releaseRes.json() : { releases: [] }
      const apiEvents = eventData.events ?? []
      const apiReleases = releaseData.releases ?? []
      const localEvents = localIds.length ? await loadLocalEvents(localIds) : []
      const localReleases = localReleaseIds.length ? await loadLocalReleases(localReleaseIds) : []
      const merged = new Map<string, GameEvent>()
      for (const event of [...apiEvents, ...localEvents]) merged.set(event.id, event)
      setWishlisted(Array.from(merged.values()))
      const mergedReleases = new Map<string, NewRelease>()
      for (const release of [...apiReleases, ...localReleases]) mergedReleases.set(release.id, release)
      setWishlistedReleases(Array.from(mergedReleases.values()))
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
            {wishlisted.length + wishlistedReleases.length
              ? `${wishlisted.length + wishlistedReleases.length} items on your wishlist.`
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
          {wishlistedReleases.map((release) => (
            <div
              key={release.id}
              data-testid={`wishlist-release-item-${release.id}`}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedRelease(release)}
              onKeyDown={(keyboardEvent) => {
                if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                  keyboardEvent.preventDefault()
                  setSelectedRelease(release)
                }
              }}
              className="grid w-full grid-cols-[80px_1fr] gap-4 rounded-lg border border-cyan-900/50 bg-cyan-950/10 p-4 text-left transition-colors hover:border-cyan-500/70 hover:bg-cyan-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <div
                className="h-20 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 bg-cover bg-center"
                style={{
                  backgroundImage: release.image_url
                    ? `linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.05)), url(${release.image_url})`
                    : `linear-gradient(135deg, ${release.hero_color ?? getReleaseHeroColor(release.platform)}66, #18181b)`,
                }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-xs font-medium text-cyan-300">New Release</div>
                <div className="font-semibold text-white">{release.title}</div>
                {release.description && (
                  <div className="mt-1 line-clamp-2 text-xs text-zinc-500">{release.description}</div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="text-xs text-zinc-500">{release.release_date}</div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 border-zinc-700 px-3 text-xs"
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation()
                      setSelectedRelease(release)
                    }}
                  >
                    View release card
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
      <ReleaseDetailPanel
        release={selectedRelease}
        isOpen={Boolean(selectedRelease)}
        onClose={() => setSelectedRelease(null)}
      />
    </div>
  )
}
