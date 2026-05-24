'use client'

import { useState, useRef, useCallback } from 'react'
import FullCalendar from '@fullcalendar/react'
import { CalendarHeader } from '@/components/calendar/CalendarHeader'
import { GameSidebar } from '@/components/calendar/GameSidebar'
import { MobileGameChips } from '@/components/calendar/MobileGameChips'
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
import { AuthModal } from '@/components/auth/AuthModal'
import { useAuth } from '@/hooks/useAuth'
import { usePreferences } from '@/hooks/usePreferences'
import { useLayoutEvents } from '@/hooks/useLayoutEvents'
import type { Game, GameEvent, NewRelease } from '@/types'

interface CalendarLayoutProps {
  games: Game[]
}

export function CalendarLayout({ games }: CalendarLayoutProps) {
  const { isGuest } = useAuth()
  const { preferences, setSelectedGames } = usePreferences()
  const calendarRef = useRef<FullCalendar>(null!)

  const [selectedGames, setLocalSelectedGames] = useState<string[]>(
    preferences.selected_games.length ? preferences.selected_games : games.map((g) => g.slug)
  )
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [selectedRelease, setSelectedRelease] = useState<NewRelease | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isReleaseOpen, setIsReleaseOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [currentTitle, setCurrentTitle] = useState('')

  const { events } = useLayoutEvents(selectedGames)

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

  const goToday = () => calendarRef.current?.getApi().today()
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
      />
      {isGuest && <GuestBanner onSignUp={() => setAuthModalOpen(true)} />}
      <PwaInstallBanner />
      <LiveBanner events={events} onEventClick={handleFeedEventClick} />
      <DailyCheckIn />
      <MobileGameChips games={games} selectedGames={selectedGames} onToggle={handleToggle} />
      <div className="flex flex-1 overflow-hidden">
        <GameSidebar
          games={games}
          selectedGames={selectedGames}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <WeeklyHighlights events={events} onEventClick={handleEventClick} />
          <div className="relative flex-1 overflow-hidden">
            <GameCalendar
              calendarRef={calendarRef}
              selectedGames={selectedGames}
              isGuest={isGuest}
              onEventClick={handleEventClick}
              onGuestEventClick={() => setAuthModalOpen(true)}
              onReleaseClick={handleReleaseClick}
              onDatesChange={handleDatesChange}
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
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  )
}
