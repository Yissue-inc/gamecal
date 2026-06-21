'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AuthForm } from '@/components/auth/AuthForm'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nextPath?: string
  source?: string
  sourceMeta?: Record<string, unknown>
  title?: string
  description?: string
  bullets?: string[]
}

const DEFAULT_BULLETS = [
  'Save wishlisted events and see them in My Wishlists.',
  'Track resets, banners, launches, and live events in your timezone.',
  'Build streaks, badges, and future tier rewards from check-ins.',
]

export function AuthModal({
  open,
  onOpenChange,
  nextPath,
  source,
  sourceMeta,
  title,
  description,
  bullets = DEFAULT_BULLETS,
}: AuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="auth-modal" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold tracking-tight">
            Gamer<span className="text-primary">Clock</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {description ?? title ?? 'Sign in to save your GamerClock progress.'}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-zinc-200">
          <p className="mb-2 font-semibold text-white">{title ?? 'Sign in free to unlock your gaming calendar.'}</p>
          {description ? <p className="mb-2 text-zinc-300">{description}</p> : null}
          <ul className="list-disc space-y-1 pl-4 text-zinc-300">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
        <AuthForm compact nextPath={nextPath} source={source} sourceMeta={sourceMeta} />
      </DialogContent>
    </Dialog>
  )
}
