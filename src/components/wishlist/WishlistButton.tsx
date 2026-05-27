'use client'

import { useState, useEffect, useCallback } from 'react'
import { Heart } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  getWishlistIds,
  isWishlistedLocal,
  toggleWishlistLocal,
} from '@/lib/engagement-store'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { trackWishlistAdded } from '@/lib/posthog'
import { getCalWishlistMessage } from '@/lib/cal-messages'
import { toast } from 'sonner'

interface WishlistButtonProps {
  eventId: string
  gameSlug?: string
  size?: 'sm' | 'md'
}

export function WishlistButton({ eventId, gameSlug, size = 'md' }: WishlistButtonProps) {
  const { user, isGuest } = useAuth()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [loading, setLoading] = useState(false)
  const useApi = isSupabaseConfigured()

  useEffect(() => {
    if (useApi && user) {
      fetch('/api/wishlist')
        .then((r) => (r.ok ? r.json() : { eventIds: [] }))
        .then((d) => setIsWishlisted((d.eventIds ?? []).includes(eventId)))
        .catch(() => setIsWishlisted(isWishlistedLocal(eventId)))
    } else {
      setIsWishlisted(isWishlistedLocal(eventId))
    }
  }, [eventId, useApi, user])

  const toggle = useCallback(async () => {
    if (isGuest || !user) {
      window.dispatchEvent(new CustomEvent('cal:prompt-login', { detail: { reason: 'wishlist' } }))
      return
    }
    setLoading(true)
    const wasWishlisted = isWishlisted

    try {
      if (useApi) {
        const res = await fetch('/api/wishlist', {
          method: wasWishlisted ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId }),
        })
        if (res.ok) {
          setIsWishlisted(!wasWishlisted)
          window.dispatchEvent(new CustomEvent('cal:wishlist-changed', { detail: { eventId } }))
          if (!wasWishlisted) {
            trackWishlistAdded(eventId, gameSlug)
            toast.success(getCalWishlistMessage(), { icon: '🤓' })
          }
        } else {
          const next = toggleWishlistLocal(eventId)
          setIsWishlisted(next)
          window.dispatchEvent(new CustomEvent('cal:wishlist-changed', { detail: { eventId } }))
        }
      } else {
        const next = toggleWishlistLocal(eventId)
        setIsWishlisted(next)
        window.dispatchEvent(new CustomEvent('cal:wishlist-changed', { detail: { eventId } }))
        if (next && !wasWishlisted) {
          trackWishlistAdded(eventId, gameSlug)
          toast.success(getCalWishlistMessage(), { icon: '🤓' })
        }
      }
    } finally {
      setLoading(false)
    }
  }, [eventId, gameSlug, isGuest, isWishlisted, useApi, user])

  return (
    <button
      type="button"
      data-testid="wishlist-button"
      onClick={toggle}
      disabled={loading}
      className={`group flex items-center gap-1.5 rounded-md border transition-all ${
        size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      } ${
        isWishlisted
          ? 'border-rose-800 bg-rose-950/60 text-rose-400'
          : 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-rose-800 hover:text-rose-400'
      }`}
    >
      <Heart
        className={`transition-all ${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} ${
          isWishlisted ? 'fill-rose-400' : 'group-hover:fill-rose-400/30'
        }`}
      />
      {isWishlisted ? 'Wishlisted' : 'Wishlist'}
    </button>
  )
}

export function useWishlistEventIds(): string[] {
  const { user } = useAuth()
  const [ids, setIds] = useState<string[]>([])
  const useApi = isSupabaseConfigured()

  useEffect(() => {
    if (useApi && user) {
      fetch('/api/wishlist')
        .then((r) => (r.ok ? r.json() : { eventIds: [] }))
        .then((d) => setIds(d.eventIds ?? []))
        .catch(() => setIds(getWishlistIds()))
    } else {
      setIds(getWishlistIds())
    }
    const refresh = () => {
      if (useApi && user) {
        fetch('/api/wishlist')
          .then((r) => (r.ok ? r.json() : { eventIds: [] }))
          .then((d) => setIds(d.eventIds ?? []))
          .catch(() => setIds(getWishlistIds()))
      } else {
        setIds(getWishlistIds())
      }
    }
    window.addEventListener('storage', refresh)
    window.addEventListener('cal:wishlist-changed', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('cal:wishlist-changed', refresh)
    }
  }, [useApi, user])

  return ids
}
