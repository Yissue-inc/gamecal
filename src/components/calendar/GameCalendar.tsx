'use client'

import { useCallback, useRef, useMemo, useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, DatesSetArg } from '@fullcalendar/core'
import { format } from 'date-fns'
import { useEvents } from '@/hooks/useEvents'
import { useReleases } from '@/hooks/useReleases'
import { usePreferences } from '@/hooks/usePreferences'
import {
  gameEventToCalendarEvent,
  getDaysUntil,
  getReleaseHeroColor,
  isToday,
} from '@/lib/utils'
import type { GameEvent, Game, NewRelease } from '@/types'

interface GameCalendarProps {
  selectedGames: string[]
  isGuest: boolean
  onEventClick: (event: GameEvent, game: Game) => void
  onGuestEventClick: () => void
  onReleaseClick: (release: NewRelease) => void
  onDatesChange: (start: Date, end: Date, title: string) => void
  calendarRef?: React.RefObject<FullCalendar>
}

export function GameCalendar({
  selectedGames,
  isGuest,
  onEventClick,
  onGuestEventClick,
  onReleaseClick,
  onDatesChange,
  calendarRef,
}: GameCalendarProps) {
  const internalRef = useRef<FullCalendar>(null)
  const ref = calendarRef ?? internalRef
  const { preferences } = usePreferences()
  const { releases } = useReleases()
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })

  const { events, loading } = useEvents({
    start: dateRange.start,
    end: dateRange.end,
    games: selectedGames,
  })

  const releasesByDate = useMemo(() => {
    const map: Record<string, NewRelease> = {}
    for (const release of releases) {
      map[release.release_date] = release
    }
    return map
  }, [releases])

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
        return cal
      })
      .sort((a, b) => {
        const orderA = a.extendedProps.importanceOrder ?? 2
        const orderB = b.extendedProps.importanceOrder ?? 2
        return orderA - orderB
      })
  }, [events, selectedGames, isGuest])

  const mountReleaseArt = useCallback(
    (cell: HTMLElement, release: NewRelease) => {
      if (cell.querySelector('.release-cell-art')) return

      const days = getDaysUntil(release.release_date)
      const dday = days === 0 ? 'D-Day' : days > 0 ? `D-${days}` : `D+${Math.abs(days)}`
      const heroColor = release.hero_color ?? getReleaseHeroColor(release.platform)

      const art = document.createElement('button')
      art.type = 'button'
      art.className = 'release-cell-art'
      art.setAttribute('data-testid', `release-cell-${release.id}`)
      art.style.backgroundImage = release.image_url
        ? `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%), url(${release.image_url})`
        : `linear-gradient(135deg, ${heroColor} 0%, #1a1a2e 100%)`
      art.style.backgroundSize = 'cover'
      art.style.backgroundPosition = 'center'
      art.innerHTML = `
        <span class="release-cell-dday">${dday}</span>
        <span class="release-cell-title">${release.title}</span>
        ${release.developer ? `<span class="release-cell-dev">${release.developer}</span>` : ''}
      `
      art.addEventListener('click', (e) => {
        e.stopPropagation()
        onReleaseClick(release)
      })

      const frame = cell.querySelector('.fc-daygrid-day-frame')
      frame?.prepend(art)
    },
    [onReleaseClick]
  )

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

  useEffect(() => {
    if (!releases.length) return
    document.querySelectorAll('.gamecal-calendar .fc-daygrid-day').forEach((node) => {
      const cell = node as HTMLElement
      const dateKey = cell.getAttribute('data-date')
      if (!dateKey) return
      const release = releasesByDate[dateKey]
      if (release) mountReleaseArt(cell, release)
    })
  }, [releases, releasesByDate, mountReleaseArt])

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
          const gameEvent = info.event.extendedProps?.gameEvent as { event_type?: string; importance?: string } | undefined
          if (game?.slug) {
            info.el.setAttribute('data-game', game.slug)
            info.el.setAttribute('data-testid', `calendar-event-${game.slug}`)
          }
          if (gameEvent?.event_type) {
            info.el.setAttribute('data-event-type', gameEvent.event_type)
          }
          if (gameEvent?.importance) {
            info.el.setAttribute('data-importance', gameEvent.importance)
          }
          if (info.el.classList.contains('critical-event')) {
            info.el.setAttribute('data-testid', 'critical-event-bar')
          }
          if (info.el.closest('.fc-day-today')) {
            info.el.setAttribute('data-testid', 'today-event')
          }
        }}
        dayCellDidMount={(info) => {
          if (info.isToday) {
            info.el.setAttribute('data-testid', 'today-cell')
          }
          const dateKey = format(info.date, 'yyyy-MM-dd')
          const release = releasesByDate[dateKey]
          if (release) {
            mountReleaseArt(info.el, release)
          }
        }}
      />
      <style jsx global>{`
        .gamecal-calendar {
          --fc-border-color: #27272a;
          --fc-today-bg-color: rgba(99, 102, 241, 0.08);
          --fc-neutral-bg-color: #1a1a1a;
          --fc-page-bg-color: #0f0f0f;
        }
        .gamecal-calendar .fc { color: #fff; }
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
        .gamecal-calendar .fc-day-today {
          background: rgba(99, 102, 241, 0.08) !important;
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
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.6);
          font-weight: 700;
        }
        .gamecal-calendar .fc-event {
          border-radius: 4px;
          font-size: 11px;
          padding: 1px 4px;
          cursor: pointer;
          border-left-width: 3px !important;
          position: relative;
        }
        .gamecal-calendar .importance-high { font-weight: 600; }
        .gamecal-calendar .importance-normal { font-weight: 500; }
        .gamecal-calendar .importance-low {
          font-size: 10px;
          opacity: 0.75;
          border-left-color: #71717a !important;
        }
        .gamecal-calendar .fc-event-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .gamecal-calendar .guest-blurred-event {
          filter: blur(4px);
          opacity: 0.35;
          border-left-color: #52525b !important;
          background: rgba(39, 39, 42, 0.6) !important;
          color: transparent !important;
          cursor: pointer;
          transition: filter 0.2s, opacity 0.2s;
        }
        .gamecal-calendar .guest-blurred-event:hover {
          filter: blur(2px);
          opacity: 0.5;
        }
        .gamecal-calendar .critical-event {
          border-left-color: #ef4444 !important;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.35), inset 3px 0 0 #ef4444;
          font-weight: 600;
        }
        .gamecal-calendar .critical-event::after {
          content: '●';
          color: #ef4444;
          font-size: 6px;
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          animation: pulse-dot 1.5s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .gamecal-calendar .release-cell-art {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          width: 100%;
          min-height: 72px;
          margin-bottom: 4px;
          padding: 6px 8px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          text-align: left;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .gamecal-calendar .release-cell-art:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        .gamecal-calendar .release-cell-dday {
          font-size: 9px;
          font-weight: 700;
          color: #fbbf24;
          text-transform: uppercase;
        }
        .gamecal-calendar .release-cell-title {
          font-size: 10px;
          font-weight: 700;
          color: #fff;
          line-height: 1.2;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .gamecal-calendar .release-cell-dev {
          font-size: 8px;
          color: rgba(255, 255, 255, 0.6);
        }
        .gamecal-calendar .fc-daygrid-day:not(.fc-day-today) .guest-blurred-event {
          pointer-events: auto;
        }
      `}</style>
    </div>
  )
}
