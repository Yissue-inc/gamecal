'use client'

import { Button } from '@/components/ui/button'

interface GuestBlurProps {
  onSignUp: () => void
}

export function GuestBanner({ onSignUp }: GuestBlurProps) {
  return (
    <div data-testid="blur-overlay" className="border-b border-indigo-900/50 bg-indigo-950/30 px-4 py-2 text-center text-sm">
      <span className="text-zinc-300">Sign up free to track events across all dates → </span>
      <Button data-testid="create-account-button" variant="link" className="h-auto p-0 text-primary" onClick={onSignUp}>
        Create free account
      </Button>
    </div>
  )
}
