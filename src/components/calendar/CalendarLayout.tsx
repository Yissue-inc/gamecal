'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import { CalendarHeader } from '@/components/calendar/CalendarHeader'
import { GameSidebar } from '@/components/calendar/GameSidebar'
import { GameCalendar } from '@/components/calendar/GameCalendar'
import { EventDetailPanel } from '@/components/calendar/EventDetailPanel'
import { ReleaseDetailPanel } from '@/components/calendar/ReleaseDetailPanel'
import { GuestBanner } from '@/components/calendar/GuestBlur'
import { WeeklyHighlights } from '@/components/calendar/WeeklyHighlights'
import { UpcomingFeed, LiveBanner } from '@/components/calendar/UpcomingFeed'
import { CommandSearch } from '@/components/calendar/CommandSearch'
import { PwaInstallBanner } from '@/components/calendar/PwaInstallBanner'
import { DailyCheckIn } from '@/components/engagement/DailyCheckIn'
import { CalEventBridge } from '@/components/engagement/CalEventBridge'
import { BadgeUnlockModal } from '@/components/engagement/BadgeUnlockModal'
import { CinematicIntro, hasSeenCinematic } from '@/components/cinematic/CinematicIntro'
import { SignupOnboarding, shouldShowOnboarding } from '@/components/onboarding/SignupOnboarding'
import { AuthModal } from '@/components/auth/AuthModal'
import { useAuth } from '@/hooks/useAuth'
import { getEventTypeLabel } from '@/lib/utils'
import { usePreferences } from '@/hooks/usePreferences'
import { useLayoutEvents } from '@/hooks/useLayoutEvents'
import type { Game, GameEvent, NewRelease } from '@/types'

interface CalendarLayoutProps {
  games: Game[]
}

export function CalendarLayout({ games }: CalendarLayoutProps) {
  const { isGuest, user } = useAuth()
  const searchParams = useSearchParams()
  const { preferences, setSelectedGames } = usePreferences()
  const calendarRef = useRef<FullCalendar>(null!)

  const [selectedGames, setLocalSelectedGames] = useState<string[]>(
    preferences.selected_games.length ? preferences.selected_games : games.map((g) => g.slug)
  )
  const [selectedReleasePlatforms, setSelectedReleasePlatforms] = useState<string[]>([
    'PC',
    'PS5',
    'Switch',
    'Mobile',
  ])
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [selectedRelease, setSelectedRelease] = useState<NewRelease | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isReleaseOpen, setIsReleaseOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [showCinematic, setShowCinematic] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [currentTitle, setCurrentTitle] = useState('')

  const { events } = useLayoutEvents(selectedGames)

  useEffect(() => {
    const replay = searchParams.get('replay') === 'cinematic'
    if (replay || !hasSeenCinematic()) {
      setShowCinematic(true)
    }
  }, [searchParams])

  useEffect(() => {
    const id = window.setTimeout(() => {
      calendarRef.current?.getApi().today()
      window.dispatchEvent(new Event('gamecal:center-today'))
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!isGuest && user && shouldShowOnboarding()) {
      setShowOnboarding(true)
    }
  }, [isGuest, user])

  const featuredEvent = useMemo(() => {
    const hero =
      events.find((e) => e.importance === 'critical' && e.game) ??
      events.find((e) => e.importance === 'high' && e.game) ??
      events.find((e) => e.game)

    if (!hero?.game) {
      return {
        eyebrow: 'World of Warcraft',
        title: 'Patch 11.2 / Seeds of Renewal',
        subtitle: 'New Raid · New Zone · Live Now',
        accentColor: '#f59e0b',
      }
    }

    const parts = hero.title.split('—').map((s) => s.trim())
    return {
      eyebrow: hero.game.name,
      title: parts[0] ?? hero.title,
      titleAccent: parts[1],
      subtitle: `${getEventTypeLabel(hero.event_type)} · Live Now`,
      accentColor: hero.game.brand_color,
      eventId: hero.id,
    }
  }, [events])

  const handleToggle = (slug: string) => {
    const next = selectedGames.includes(slug)
      ? selectedGames.filter((s) => s !== slug)
      : [...selectedGames, slug]
    setLocalSelectedGames(next)
    setSelectedGames(next)
  }

  const handleToggleAll = (all: boolean) => {
    const next = all ? games.map((g) => g.slug) : []
    setLocalSelectedGames(next)
    setSelectedGames(next)
  }

  const handleToggleReleasePlatform = (platform: string) => {
    setSelectedReleasePlatforms((prev) =>
      prev.includes(platform) ? prev.filter((item) => item !== platform) : [...prev, platform]
    )
  }

  const handleEventClick = (event: GameEvent, game: Game) => {
    setSelectedRelease(null)
    setIsReleaseOpen(false)
    setSelectedEvent(event)
    setSelectedGame(game)
    setIsDetailOpen(true)
  }

  const handleFeedEventClick = (event: GameEvent) => {
    if (event.game) handleEventClick(event, event.game)
  }

  const handleReleaseClick = (release: NewRelease) => {
    setSelectedEvent(null)
    setSelectedGame(null)
    setIsDetailOpen(false)
    setSelectedRelease(release)
    setIsReleaseOpen(true)
  }

  const handleDatesChange = useCallback((_start: Date, _end: Date, title: string) => {
    setCurrentTitle(title)
  }, [])

  const goToday = () => {
    calendarRef.current?.getApi().today()
    window.setTimeout(() => {
      window.dispatchEvent(new Event('gamecal:center-today'))
    }, 0)
  }
  const goPrev = () => calendarRef.current?.getApi().prev()
  const goNext = () => calendarRef.current?.getApi().next()

  const closeDetail = () => {
    setIsDetailOpen(false)
    setSelectedEvent(null)
    setSelectedGame(null)
  }

  return (
    <div className="flex h-screen flex-col bg-[#0f0f0f]">
      <CalendarHeader
        currentTitle={currentTitle}
        onToday={goToday}
        onPrev={goPrev}
        onNext={goNext}
        onSignIn={() => setAuthModalOpen(true)}
        games={games}
        selectedGames={selectedGames}
        onToggleGame={handleToggle}
        onToggleAllGames={handleToggleAll}
        selectedReleasePlatforms={selectedReleasePlatforms}
        onToggleReleasePlatform={handleToggleReleasePlatform}
        events={events}
      />
      {isGuest && <GuestBanner onSignUp={() => setAuthModalOpen(true)} />}
      <PwaInstallBanner />
      <LiveBanner events={events} onEventClick={handleFeedEventClick} />
      <DailyCheckIn />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <GameSidebar
          games={games}
          selectedGames={selectedGames}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
          selectedReleasePlatforms={selectedReleasePlatforms}
          onToggleReleasePlatform={handleToggleReleasePlatform}
          events={events}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <WeeklyHighlights
            events={events}
            onEventClick={handleEventClick}
            onReleaseClick={handleReleaseClick}
          />
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <GameCalendar
              calendarRef={calendarRef}
              selectedGames={selectedGames}
              isGuest={isGuest}
              onEventClick={handleEventClick}
              onGuestEventClick={() => setAuthModalOpen(true)}
              onReleaseClick={handleReleaseClick}
              onDatesChange={handleDatesChange}
              selectedReleasePlatforms={selectedReleasePlatforms}
            />
            <EventDetailPanel
              event={selectedEvent}
              game={selectedGame}
              isOpen={isDetailOpen}
              onClose={closeDetail}
              overlay
            />
          </div>
        </div>
        <div className="hidden md:flex">
          <UpcomingFeed events={events} onEventClick={handleFeedEventClick} />
        </div>
      </div>
      <ReleaseDetailPanel
        release={selectedRelease}
        isOpen={isReleaseOpen}
        onClose={() => {
          setIsReleaseOpen(false)
          setSelectedRelease(null)
        }}
      />
      <CommandSearch events={events} onSelect={handleFeedEventClick} />
      <CalEventBridge onPromptLogin={() => setAuthModalOpen(true)} />
      <BadgeUnlockModal />
      {showCinematic && (
        <CinematicIntro
          featured={featuredEvent}
          onDismiss={() => setShowCinematic(false)}
          onAddToCalendar={() => {
            if (isGuest) setAuthModalOpen(true)
            else if (featuredEvent.eventId) {
              const match = events.find((e) => e.id === featuredEvent.eventId)
              if (match?.game) handleEventClick(match, match.game)
            }
          }}
        />
      )}
      <SignupOnboarding
        open={showOnboarding}
        games={games}
        onComplete={() => setShowOnboarding(false)}
      />
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  )
}
