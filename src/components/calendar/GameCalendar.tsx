'use client'

import { useCallback, useRef, useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, DatesSetArg } from '@fullcalendar/core'
import { useEvents } from '@/hooks/useEvents'
import { usePreferences } from '@/hooks/usePreferences'
import { gameEventToCalendarEvent } from '@/lib/utils'
import type { GameEvent, Game } from '@/types'
import { isToday } from '@/lib/utils'

interface GameCalendarProps {
  selectedGames: string[]
  isGuest: boolean
  onEventClick: (event: GameEvent, game: Game) => void
  onGuestEventClick: () => void
  onDatesChange: (start: Date, end: Date, title: string) => void
  calendarRef?: React.RefObject<FullCalendar>
}

export function GameCalendar({
  selectedGames,
  isGuest,
  onEventClick,
  onGuestEventClick,
  onDatesChange,
  calendarRef,
}: GameCalendarProps) {
  const internalRef = useRef<FullCalendar>(null)
  const ref = calendarRef ?? internalRef
  const { preferences } = usePreferences()
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })

  const { events, loading } = useEvents({
    start: dateRange.start,
    end: dateRange.end,
    games: selectedGames,
  })

  const calendarEvents = useMemo(() => {
    return events
      .filter((e) => e.game && selectedGames.includes(e.game.slug))
      .map((e) => {
        const cal = gameEventToCalendarEvent(e, e.game!)
        if (isGuest && !isToday(e.start_at)) {
          return {
            ...cal,
            title: '🔒 Hidden Event',
            classNames: ['guest-blurred-event'],
          }
        }
        if (e.importance === 'critical') {
          return { ...cal, classNames: [...(cal.classNames ?? []), 'critical-event'] }
        }
        return cal
      })
  }, [events, selectedGames, isGuest])

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      setDateRange({ start: arg.start.toISOString(), end: arg.end.toISOString() })
      onDatesChange(arg.start, arg.end, arg.view.title)
    },
    [onDatesChange]
  )

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const { gameEvent, game } = info.event.extendedProps as { gameEvent: GameEvent; game: Game }
      if (isGuest && !isToday(gameEvent.start_at)) {
        onGuestEventClick()
        return
      }
      onEventClick(gameEvent, game)
    },
    [isGuest, onEventClick, onGuestEventClick]
  )

  return (
    <div className="gamecal-calendar relative flex-1 overflow-hidden p-4" data-testid="calendar-grid">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0f0f0f]/50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      <FullCalendar
        ref={ref}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={false}
        events={calendarEvents}
        eventClick={handleEventClick}
        datesSet={handleDatesSet}
        firstDay={preferences.week_starts_on}
        weekends={preferences.show_weekends}
        height="100%"
        dayMaxEvents={4}
        eventDisplay="block"
        fixedWeekCount={false}
        eventDidMount={(info) => {
          const game = info.event.extendedProps?.game as { slug?: string } | undefined
          if (game?.slug) {
            info.el.setAttribute('data-game', game.slug)
            info.el.setAttribute('data-testid', `calendar-event-${game.slug}`)
          }
          if (info.el.classList.contains('fc-day-today') || info.el.closest('.fc-day-today')) {
            info.el.setAttribute('data-testid', 'today-event')
          }
        }}
        dayCellDidMount={(info) => {
          if (info.isToday) {
            info.el.setAttribute('data-testid', 'today-cell')
          }
        }}
      />
      <style jsx global>{`
        .gamecal-calendar {
          --fc-border-color: #27272a;
          --fc-today-bg-color: rgba(99, 102, 241, 0.1);
          --fc-neutral-bg-color: #1a1a1a;
          --fc-page-bg-color: #0f0f0f;
        }
        .gamecal-calendar .fc {
          color: #fff;
        }
        .gamecal-calendar .fc-col-header-cell {
          background: #1a1a1a;
          padding: 8px 0;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: #a1a1aa;
        }
        .gamecal-calendar .fc-daygrid-day-number {
          color: #d4d4d8;
          padding: 8px;
          font-size: 13px;
        }
        .gamecal-calendar .fc-day-today .fc-daygrid-day-number {
          background: #6366f1;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          margin: 4px;
        }
        .gamecal-calendar .fc-event {
          border-radius: 4px;
          font-size: 11px;
          padding: 1px 4px;
          cursor: pointer;
          border-left-width: 3px !important;
        }
        .gamecal-calendar .fc-event-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gamecal-calendar .guest-blurred-event {
          filter: blur(3px);
          opacity: 0.4;
        }
        .gamecal-calendar .critical-event {
          border-left-color: #ef4444 !important;
          box-shadow: inset 3px 0 0 #ef4444;
        }
        .gamecal-calendar .fc-daygrid-day:not(.fc-day-today) .guest-blurred-event {
          pointer-events: auto;
        }
      `}</style>
    </div>
  )
}
