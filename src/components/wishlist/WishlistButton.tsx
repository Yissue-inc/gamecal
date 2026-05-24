'use client'

import { useState, useEffect, useCallback } from 'react'
import { Heart } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  getWishlistIds,
  isWishlistedLocal,
  toggleWishlistLocal,
} from '@/lib/engagement-store'
import { getCalWishlistMessage } from '@/lib/cal-messages'
import { toast } from 'sonner'

interface WishlistButtonProps {
  eventId: string
  size?: 'sm' | 'md'
}

export function WishlistButton({ eventId, size = 'md' }: WishlistButtonProps) {
  const { user, isGuest } = useAuth()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setIsWishlisted(isWishlistedLocal(eventId))
  }, [eventId])

  const toggle = useCallback(async () => {
    if (isGuest || !user) {
      window.dispatchEvent(new CustomEvent('cal:prompt-login', { detail: { reason: 'wishlist' } }))
      return
    }
    setLoading(true)
    const wasWishlisted = isWishlistedLocal(eventId)
    const next = toggleWishlistLocal(eventId)
    setIsWishlisted(next)
    if (next && !wasWishlisted) {
      toast.success(getCalWishlistMessage(), { icon: '🤓' })
      window.dispatchEvent(new CustomEvent('cal:wishlist-added', { detail: { eventId } }))
    }
    setLoading(false)
  }, [eventId, isGuest, user])

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
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    setIds(getWishlistIds())
    const refresh = () => setIds(getWishlistIds())
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  return ids
}
