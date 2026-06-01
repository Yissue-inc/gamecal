'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, ChevronLeft, ChevronRight, Info, Menu, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PrestigeChip } from '@/components/engagement/PrestigeChip'
import { GameSidebar } from '@/components/calendar/GameSidebar'
import { formatTimezoneLabel } from '@/lib/timezone'
import { useAuth } from '@/hooks/useAuth'
import { usePreferences } from '@/hooks/usePreferences'
import type { Game, GameEvent } from '@/types'

interface CalendarHeaderProps {
  currentTitle: string
  onToday: () => void
  onPrev: () => void
  onNext: () => void
  onSignIn?: () => void
  games: Game[]
  selectedGames: string[]
  onToggleGame: (slug: string) => void
  onToggleAllGames: (all: boolean) => void
  selectedReleasePlatforms: string[]
  onToggleReleasePlatform: (platform: string) => void
  releasePlatformCounts?: Record<string, number>
  events: GameEvent[]
}

export function CalendarHeader({
  currentTitle,
  onToday,
  onPrev,
  onNext,
  onSignIn,
  games,
  selectedGames,
  onToggleGame,
  onToggleAllGames,
  selectedReleasePlatforms,
  onToggleReleasePlatform,
  releasePlatformCounts,
  events,
}: CalendarHeaderProps) {
  const { user, isGuest, loading: authLoading, signOut } = useAuth()
  const { preferences } = usePreferences()
  const timezone = preferences.timezone
  const mobileTitle = currentTitle.split(' ')[0] || 'Today'
  const openSearch = () => window.dispatchEvent(new Event('gamecal:open-search'))
  const shouldShowSignIn = !authLoading && isGuest

  return (
    <header data-testid="calendar-header" className="border-b border-zinc-800 bg-[#0f0f0f]">
      <div className="hidden h-14 grid-cols-[minmax(140px,1fr)_auto_minmax(180px,1fr)] items-center gap-3 px-4 md:grid">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" data-testid="logo-link" className="flex items-center gap-2 font-rajdhani text-xl font-bold tracking-tight">
            <Image src="/header-icon.png" alt="GamerClock" width={44} height={44} className="h-11 w-11 shrink-0" priority />
            <span>Gamer<span className="text-primary">Clock</span></span>
          </Link>
        </div>

        <div className="flex min-w-0 items-center justify-center gap-2">
          <Button data-testid="nav-today" variant="outline" size="sm" onClick={onToday} className="border-zinc-700">
            Today
          </Button>
          <Button data-testid="nav-prev" variant="ghost" size="icon" onClick={onPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button data-testid="nav-next" variant="ghost" size="icon" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span data-testid="calendar-month-title" className="font-rajdhani min-w-[120px] text-lg font-semibold">{currentTitle}</span>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2 overflow-visible pr-1">
          <Link
            href="/settings"
            data-testid="timezone-label"
            className="hidden shrink truncate text-[10px] text-zinc-500 transition hover:text-zinc-300 xl:inline"
            title={`Events shown in ${timezone}`}
          >
            🌍 {formatTimezoneLabel(timezone)}
          </Link>
          <PrestigeChip />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/new-releases" data-testid="new-releases-link">New Releases</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/about" data-testid="about-link">About</Link>
          </Button>
          {shouldShowSignIn ? (
            <Button data-testid="signin-button" size="sm" className="shrink-0" onClick={onSignIn}>
              Sign In
            </Button>
          ) : authLoading ? (
            <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-800" aria-label="Loading account" />
          ) : (
            <UserMenu userEmail={user?.email} onSignOut={signOut} />
          )}
        </div>
      </div>

      <div className="flex h-12 items-center gap-1.5 px-2 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button data-testid="mobile-menu-button" variant="ghost" size="icon" className="h-10 w-10 shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[84vw] max-w-[320px] p-0">
            <SheetTitle className="sr-only">Next Up</SheetTitle>
            <GameSidebar
              mobile
              games={games}
              selectedGames={selectedGames}
              onToggle={onToggleGame}
              onToggleAll={onToggleAllGames}
              selectedReleasePlatforms={selectedReleasePlatforms}
              onToggleReleasePlatform={onToggleReleasePlatform}
              releasePlatformCounts={releasePlatformCounts}
              events={events}
            />
          </SheetContent>
        </Sheet>

        <Link href="/" data-testid="mobile-logo-link" className="flex min-w-0 shrink items-center gap-1.5 font-rajdhani text-lg font-bold tracking-tight">
          <Image src="/header-icon.png" alt="GamerClock" width={40} height={40} className="h-10 w-10 shrink-0" priority />
          <span className="truncate">Gamer<span className="text-primary">Clock</span></span>
        </Link>

        <button
          type="button"
          data-testid="mobile-month-button"
          onClick={onToday}
          className="flex h-9 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-sm font-medium text-zinc-200"
        >
          {mobileTitle}
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <Button data-testid="mobile-search-button" variant="ghost" size="icon" className="h-9 w-9" onClick={openSearch}>
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
          <Button data-testid="mobile-about-link" variant="ghost" size="icon" className="h-9 w-9" asChild>
            <Link href="/about" aria-label="About GamerClock">
              <Info className="h-4 w-4" />
            </Link>
          </Button>
          <Button data-testid="mobile-new-link" variant="ghost" size="sm" className="h-9 px-1.5 text-[11px] font-bold text-primary" asChild>
            <Link href="/new-releases">New</Link>
          </Button>
          <Button data-testid="mobile-today-button" variant="ghost" size="sm" className="h-9 px-1.5 text-[10px] font-black uppercase tracking-wide" onClick={onToday}>
            Today
          </Button>
          {shouldShowSignIn ? (
            <Button data-testid="mobile-signin-button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onSignIn}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-zinc-700 text-xs">C</AvatarFallback>
              </Avatar>
            </Button>
          ) : authLoading ? (
            <div className="h-8 w-8 rounded-full bg-zinc-800" aria-label="Loading account" />
          ) : (
            <UserMenu userEmail={user?.email} onSignOut={signOut} mobile />
          )}
        </div>
      </div>
    </header>
  )
}

function UserMenu({
  userEmail,
  onSignOut,
  mobile = false,
}: {
  userEmail?: string
  onSignOut: () => void
  mobile?: boolean
}) {
  const initial = userEmail?.[0]?.toUpperCase() ?? 'U'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-testid="user-menu"
          variant="ghost"
          size={mobile ? 'icon' : 'sm'}
          aria-label="Open profile menu"
          className={
            mobile
              ? 'h-9 w-9 shrink-0 rounded-full border border-indigo-400/40 bg-indigo-500/90 p-0 text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-400'
              : 'h-10 shrink-0 gap-2 rounded-full border border-zinc-700 bg-zinc-900/90 px-2.5 pr-3 text-zinc-100 shadow-sm shadow-black/20 hover:border-indigo-400/70 hover:bg-zinc-800'
          }
        >
          <Avatar className={mobile ? 'h-8 w-8' : 'h-7 w-7'}>
            <AvatarFallback className="bg-indigo-500 text-xs font-bold text-white">
              {initial}
            </AvatarFallback>
          </Avatar>
          {!mobile && <span className="text-sm font-semibold">Profile</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {userEmail && (
          <DropdownMenuItem disabled className="max-w-64 truncate text-xs text-zinc-400">
            {userEmail}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/my-schedule" data-testid="header-my-schedule">My Wishlists</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile" data-testid="header-profile">Profile & Badges</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem data-testid="signout-button" onClick={onSignOut}>Sign Out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
