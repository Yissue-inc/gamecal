'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AuthForm } from '@/components/auth/AuthForm'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="auth-modal" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold tracking-tight">
            Gamer<span className="text-primary">Clock</span>
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-zinc-200">
          <p className="mb-2 font-semibold text-white">Sign in free to unlock your gaming calendar.</p>
          <ul className="list-disc space-y-1 pl-4 text-zinc-300">
            <li>Save wishlisted events and see them in My Wishlists.</li>
            <li>Track resets, banners, launches, and live events in your timezone.</li>
            <li>Build streaks, badges, and future tier rewards from check-ins.</li>
          </ul>
        </div>
        <AuthForm compact />
      </DialogContent>
    </Dialog>
  )
}
