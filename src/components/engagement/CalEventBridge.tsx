'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { getCalLoginPrompt } from '@/lib/cal-messages'

interface CalEventBridgeProps {
  onPromptLogin: () => void
}

export function CalEventBridge({ onPromptLogin }: CalEventBridgeProps) {
  useEffect(() => {
    const loginHandler = (e: Event) => {
      const reason = ((e as CustomEvent).detail?.reason ?? 'wishlist') as 'wishlist' | 'reminder' | 'checkin'
      toast.info(getCalLoginPrompt(reason), { icon: '📋', duration: 5000 })
      onPromptLogin()
    }
    window.addEventListener('cal:prompt-login', loginHandler)
    return () => window.removeEventListener('cal:prompt-login', loginHandler)
  }, [onPromptLogin])

  return null
}
