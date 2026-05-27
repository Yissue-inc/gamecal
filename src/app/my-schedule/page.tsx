'use client'

import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalCharacter } from '@/components/engagement/CalCharacter'
import { getWishlistIds } from '@/lib/engagement-store'
import { isSupabaseConfigured } from '@/lib/mock-data'
import type { GameEvent } from '@/types'

export default function MySchedulePage() {
  const { user, isGuest } = useAuth()
  const [wishlisted, setWishlisted] = useState<GameEvent[]>([])

  useEffect(() => {
    async function loadWishlist() {
      if (!isSupabaseConfigured() || !user) {
        const ids = getWishlistIds()
        if (!ids.length) {
          setWishlisted([])
          return
        }
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
        setWishlisted((data.events ?? []).filter((event: GameEvent) => ids.includes(event.id)))
        return
      }

      const res = await fetch('/api/wishlist')
      const data = await res.json()
      setWishlisted(data.events ?? [])
    }

    loadWishlist()
    window.addEventListener('cal:wishlist-changed', loadWishlist)
    return () => window.removeEventListener('cal:wishlist-changed', loadWishlist)
  }, [user])

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
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="text-xs font-medium" style={{ color: event.game?.brand_color }}>
                {event.game?.name}
              </div>
              <div className="font-semibold text-white">{event.title}</div>
              <div className="text-xs text-zinc-500">{event.start_at.slice(0, 10)}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
