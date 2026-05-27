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
        <AuthForm compact />
      </DialogContent>
    </Dialog>
  )
}
