'use client'

import { useEffect } from 'react'

interface CalEventBridgeProps {
  onPromptLogin: () => void
}

export function CalEventBridge({ onPromptLogin }: CalEventBridgeProps) {
  useEffect(() => {
    const loginHandler = () => {
      onPromptLogin()
    }
    window.addEventListener('cal:prompt-login', loginHandler)
    return () => window.removeEventListener('cal:prompt-login', loginHandler)
  }, [onPromptLogin])

  return null
}
