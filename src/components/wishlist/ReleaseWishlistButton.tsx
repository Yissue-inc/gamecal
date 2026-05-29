'use client'

import { useCallback, useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { trackWishlistAdded } from '@/lib/posthog'
import { getCalWishlistMessage } from '@/lib/cal-messages'
import {
  isReleaseWishlistedLocal,
  setReleaseWishlistLocal,
  toggleReleaseWishlistLocal,
} from '@/lib/engagement-store'

interface ReleaseWishlistButtonProps {
  releaseId: string
  platform?: string
  size?: 'sm' | 'md'
}

export function ReleaseWishlistButton({ releaseId, platform, size = 'md' }: ReleaseWishlistButtonProps) {
  const { user, isGuest } = useAuth()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [loading, setLoading] = useState(false)
  const useApi = isSupabaseConfigured()

  useEffect(() => {
    if (useApi && user) {
      fetch('/api/release-wishlist')
        .then((res) => (res.ok ? res.json() : { releaseIds: [] }))
        .then((data) => setIsWishlisted((data.releaseIds ?? []).includes(releaseId)))
        .catch(() => setIsWishlisted(isReleaseWishlistedLocal(releaseId)))
    } else {
      setIsWishlisted(isReleaseWishlistedLocal(releaseId))
    }
  }, [releaseId, useApi, user])

  const toggle = useCallback(async () => {
    if (isGuest || !user) {
      window.dispatchEvent(new CustomEvent('cal:prompt-login', { detail: { reason: 'wishlist' } }))
      return
    }

    setLoading(true)
    const wasWishlisted = isWishlisted

    try {
      if (useApi) {
        const res = await fetch('/api/release-wishlist', {
          method: wasWishlisted ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ releaseId }),
        })
        if (!res.ok) throw new Error('Release wishlist failed')
        setIsWishlisted(!wasWishlisted)
        setReleaseWishlistLocal(releaseId, !wasWishlisted)
      } else {
        const next = toggleReleaseWishlistLocal(releaseId)
        setIsWishlisted(next)
      }

      window.dispatchEvent(new CustomEvent('cal:wishlist-changed', { detail: { releaseId } }))
      if (!wasWishlisted) {
        trackWishlistAdded(releaseId, platform ? `new-release-${platform}` : 'new-release')
        toast.success(getCalWishlistMessage(), { icon: '🤓' })
      }
    } catch {
      const next = toggleReleaseWishlistLocal(releaseId)
      setIsWishlisted(next)
      window.dispatchEvent(new CustomEvent('cal:wishlist-changed', { detail: { releaseId } }))
      if (next && !wasWishlisted) {
        toast.success('Saved locally. Cloud wishlist sync needs attention.', { icon: '🤓' })
      }
    } finally {
      setLoading(false)
    }
  }, [isGuest, isWishlisted, platform, releaseId, useApi, user])

  return (
    <button
      type="button"
      data-testid="release-wishlist-button"
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
