'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'

interface CalendarHeaderProps {
  currentTitle: string
  onToday: () => void
  onPrev: () => void
  onNext: () => void
  onSignIn?: () => void
}

export function CalendarHeader({ currentTitle, onToday, onPrev, onNext, onSignIn }: CalendarHeaderProps) {
  const { user, isGuest, signOut } = useAuth()

  return (
    <header data-testid="calendar-header" className="flex h-14 items-center justify-between border-b border-zinc-800 bg-[#0f0f0f] px-4">
      <div className="flex items-center gap-4">
        <Link href="/" data-testid="logo-link" className="font-rajdhani text-xl font-bold tracking-tight">
          GAME<span className="text-primary">CAL</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Button data-testid="nav-today" variant="outline" size="sm" onClick={onToday} className="border-zinc-700">
          Today
        </Button>
        <Button data-testid="nav-prev" variant="ghost" size="icon" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button data-testid="nav-next" variant="ghost" size="icon" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span data-testid="calendar-month-title" className="font-rajdhani min-w-[140px] text-lg font-semibold">{currentTitle}</span>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/new-releases" data-testid="new-releases-link">New Releases</Link>
        </Button>
        {isGuest ? (
          <Button data-testid="signin-button" size="sm" onClick={onSignIn}>
            Sign In
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-testid="user-menu" variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-xs">
                    {user?.email?.[0]?.toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="signout-button" onClick={() => signOut()}>Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
