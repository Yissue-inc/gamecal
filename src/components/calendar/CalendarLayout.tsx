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
import { DragonPresence } from '@/components/engagement/DragonPresence'
import { CalEventBridge } from '@/components/engagement/CalEventBridge'
import { BadgeUnlockModal } from '@/components/engagement/BadgeUnlockModal'
import { CinematicIntro, hasSeenCinematic } from '@/components/cinematic/CinematicIntro'
import { SignupOnboarding, shouldShowOnboarding } from '@/components/onboarding/SignupOnboarding'
import { AuthModal } from '@/components/auth/AuthModal'
import { useAuth } from '@/hooks/useAuth'
import { useReleases } from '@/hooks/useReleases'
import { RELEASE_PLATFORM_ALL, countReleasePlatforms } from '@/lib/release-platforms'
import { getEventTypeLabel } from '@/lib/utils'
import { DEFAULT_PUBLIC_UI_SETTINGS, mergePublicUiSettings } from '@/lib/public-ui-settings'
import { usePreferences } from '@/hooks/usePreferences'
import { useLayoutEvents } from '@/hooks/useLayoutEvents'
import type { Game, GameEvent, NewRelease } from '@/types'

interface CalendarLayoutProps {
  games: Game[]
}

export function CalendarLayout({ games }: CalendarLayoutProps) {
  const { isGuest, user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const { preferences, setSelectedGames } = usePreferences()
  const calendarRef = useRef<FullCalendar>(null!)

  const [selectedGames, setLocalSelectedGames] = useState<string[]>(
    preferences.selected_games.length ? preferences.selected_games : games.map((g) => g.slug)
  )
  const [selectedReleasePlatforms, setSelectedReleasePlatforms] = useState<string[]>([RELEASE_PLATFORM_ALL])
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [selectedRelease, setSelectedRelease] = useState<NewRelease | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isReleaseOpen, setIsReleaseOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [showCinematic, setShowCinematic] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [introSettings, setIntroSettings] = useState(DEFAULT_PUBLIC_UI_SETTINGS)
  const [currentTitle, setCurrentTitle] = useState('')

  const { events } = useLayoutEvents(selectedGames)
  const { events: highlightEvents } = useLayoutEvents([])
  const { releases } = useReleases()
  const releasePlatformCounts = useMemo(() => countReleasePlatforms(releases), [releases])
  const shouldPromptAuth = !authLoading && isGuest

  useEffect(() => {
    let cancelled = false

    fetch('/api/site-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.settings) {
          setIntroSettings((prev) => mergePublicUiSettings({ ...prev, ...data.settings }))
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!introSettings.show_cinematic_intro) return
    const replay = searchParams.get('replay') === 'cinematic'
    if (replay || !hasSeenCinematic()) {
      setShowCinematic(true)
    }
  }, [introSettings.show_cinematic_intro, searchParams])

  useEffect(() => {
    const id = window.setTimeout(() => {
      calendarRef.current?.getApi().today()
      window.dispatchEvent(new Event('gamecal:center-today'))
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    if (introSettings.show_signup_onboarding && !authLoading && !isGuest && user && shouldShowOnboarding()) {
      setShowOnboarding(true)
    }
  }, [authLoading, introSettings.show_signup_onboarding, isGuest, user])

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
    setSelectedReleasePlatforms((prev) => {
      if (platform === RELEASE_PLATFORM_ALL) return [RELEASE_PLATFORM_ALL]

      const withoutAll = prev.filter((item) => item !== RELEASE_PLATFORM_ALL)
      const next = withoutAll.includes(platform)
        ? withoutAll.filter((item) => item !== platform)
        : [...withoutAll, platform]

      return next.length ? next : [RELEASE_PLATFORM_ALL]
    })
  }

  const handleEventClick = (event: GameEvent, game: Game) => {
    if (shouldPromptAuth) {
      setAuthModalOpen(true)
      return
    }
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
    if (shouldPromptAuth) {
      setAuthModalOpen(true)
      return
    }
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
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#0f0f0f]">
      <DragonPresence />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
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
          releasePlatformCounts={releasePlatformCounts}
          events={events}
        />
        {shouldPromptAuth && <GuestBanner onSignUp={() => setAuthModalOpen(true)} />}
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
            releasePlatformCounts={releasePlatformCounts}
            events={events}
          />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <WeeklyHighlights
              events={highlightEvents}
              onEventClick={handleEventClick}
              onReleaseClick={handleReleaseClick}
            />
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <GameCalendar
                calendarRef={calendarRef}
                selectedGames={selectedGames}
                isGuest={shouldPromptAuth}
                onEventClick={handleEventClick}
                onGuestEventClick={() => {
                  if (shouldPromptAuth) setAuthModalOpen(true)
                }}
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
      <CalEventBridge
        onPromptLogin={() => {
          if (shouldPromptAuth) setAuthModalOpen(true)
        }}
      />
      <BadgeUnlockModal />
      {showCinematic && (
        <CinematicIntro
          featured={featuredEvent}
          settings={introSettings.cinematic_intro}
          onDismiss={() => setShowCinematic(false)}
          onAddToCalendar={() => {
            if (shouldPromptAuth) setAuthModalOpen(true)
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
