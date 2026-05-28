'use client'

import { useCallback, useRef, useMemo, useState, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, DatesSetArg } from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import { format } from 'date-fns'
import { useEvents } from '@/hooks/useEvents'
import { usePreferences } from '@/hooks/usePreferences'
import { useReleases } from '@/hooks/useReleases'
import { getEventArtUrl, getEventFallbackDescription } from '@/lib/game-art'
import { releaseMatchesPlatforms } from '@/lib/release-platforms'
import {
  getRewardBadgeLabel,
  getRewardSignals,
  getRewardSortScore,
  getSourceConfidenceLabel,
  getSourceConfidenceTone,
} from '@/lib/reward-signals'
import {
  gameEventToCalendarEvent,
  formatTime,
  getDaysUntil,
  getEventTypeLabel,
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
  selectedReleasePlatforms?: string[]
  calendarRef?: React.RefObject<FullCalendar>
}

export function centerTodayInCalendar(calendarEl?: HTMLElement | null) {
  const root = calendarEl ?? document.querySelector<HTMLElement>('.gamecal-calendar')
  if (!root) return false

  const scroller = root.querySelector<HTMLElement>('.fc-scroller-liquid-absolute')
  const todayCell = root.querySelector<HTMLElement>('.fc-day-today')
  if (!scroller || !todayCell || scroller.scrollHeight <= scroller.clientHeight) return false

  const scrollerRect = scroller.getBoundingClientRect()
  const todayRect = todayCell.getBoundingClientRect()
  const nextTop =
    scroller.scrollTop +
    todayRect.top -
    scrollerRect.top -
    scroller.clientHeight / 2 +
    todayCell.clientHeight / 2

  scroller.scrollTo({
    top: Math.max(0, nextTop),
    behavior: 'auto',
  })
  return true
}

function dateKeyInTimezone(value: string | Date, timezone: string): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

function isEventOnDate(event: GameEvent, dateKey: string, timezone: string): boolean {
  const startKey = dateKeyInTimezone(event.start_at, timezone)
  const endKey = dateKeyInTimezone(event.end_at ?? event.start_at, timezone)
  return startKey <= dateKey && endKey >= dateKey
}

function formatSelectedDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return format(new Date(year, month - 1, day), 'MMM d, yyyy')
}

export function GameCalendar({
  selectedGames,
  isGuest,
  onEventClick,
  onGuestEventClick,
  onReleaseClick,
  onDatesChange,
  selectedReleasePlatforms = [],
  calendarRef,
}: GameCalendarProps) {
  const internalRef = useRef<FullCalendar>(null)
  const ref = calendarRef ?? internalRef
  const { preferences } = usePreferences()
  const { releases } = useReleases()
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const shouldCenterTodayRef = useRef(true)
  const selectedEventsRef = useRef<HTMLElement>(null)

  const { events, loading } = useEvents({
    start: dateRange.start,
    end: dateRange.end,
    games: selectedGames,
  })

  const visibleReleases = useMemo(() => {
    return releases.filter((release) => releaseMatchesPlatforms(release, selectedReleasePlatforms))
  }, [releases, selectedReleasePlatforms])

  const releasesByDate = useMemo(() => {
    const map: Record<string, NewRelease> = {}
    for (const release of visibleReleases) {
      map[release.release_date] = release
    }
    return map
  }, [visibleReleases])

  const calendarEvents = useMemo(() => {
    return events
      .filter((e) => e.game && selectedGames.includes(e.game.slug))
      .map((e) => {
        const cal = gameEventToCalendarEvent(e, e.game!)
        if (isGuest && !isToday(e.start_at, preferences.timezone)) {
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
  }, [events, selectedGames, isGuest, preferences.timezone])

  const selectedDateEvents = useMemo(() => {
    if (!selectedDateKey) return []
    return events
      .filter((event) => event.game && selectedGames.includes(event.game.slug))
      .filter((event) => isEventOnDate(event, selectedDateKey, preferences.timezone))
      .sort((a, b) => {
        const importanceOrder = { critical: 0, high: 1, normal: 2, low: 3 }
        const rewardOrder = getRewardSortScore(b) - getRewardSortScore(a)
        if (rewardOrder !== 0) return rewardOrder
        const order = importanceOrder[a.importance] - importanceOrder[b.importance]
        if (order !== 0) return order
        return new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      })
  }, [events, selectedDateKey, selectedGames, preferences.timezone])

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
        <span class="release-cell-title">NEW / ${release.title}</span>
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
      if (shouldCenterTodayRef.current) {
        window.requestAnimationFrame(() => centerTodayInCalendar())
      }
    },
    [onDatesChange]
  )

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const { gameEvent, game } = info.event.extendedProps as { gameEvent: GameEvent; game: Game }
      if (isGuest) {
        onGuestEventClick()
        return
      }
      onEventClick(gameEvent, game)
    },
    [isGuest, onEventClick, onGuestEventClick]
  )

  const handleDateClick = useCallback(
    (info: DateClickArg) => {
      if (isGuest) {
        onGuestEventClick()
        return
      }
      setSelectedDateKey(info.dateStr)
    },
    [isGuest, onGuestEventClick]
  )

  useEffect(() => {
    document.querySelectorAll('.gamecal-calendar .fc-daygrid-day').forEach((node) => {
      const cell = node as HTMLElement
      cell.classList.toggle('gamecal-selected-day', cell.getAttribute('data-date') === selectedDateKey)
    })

    if (!selectedDateKey) return
    window.setTimeout(() => {
      selectedEventsRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: window.innerWidth < 768 ? 'center' : 'nearest',
      })
    }, 80)
  }, [selectedDateKey])

  useEffect(() => {
    if (!visibleReleases.length) return
    document.querySelectorAll('.gamecal-calendar .fc-daygrid-day').forEach((node) => {
      const cell = node as HTMLElement
      const dateKey = cell.getAttribute('data-date')
      if (!dateKey) return
      const release = releasesByDate[dateKey]
      if (release) mountReleaseArt(cell, release)
    })
  }, [visibleReleases, releasesByDate, mountReleaseArt])

  useEffect(() => {
    if (!shouldCenterTodayRef.current) return

    const delays = [0, 100, 300, 700]
    const timers = delays.map((delay) =>
      window.setTimeout(() => {
        if (centerTodayInCalendar()) {
          shouldCenterTodayRef.current = false
        }
      }, delay)
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [events, visibleReleases, dateRange.start, dateRange.end])

  useEffect(() => {
    const centerHandler = () => {
      shouldCenterTodayRef.current = true
      window.requestAnimationFrame(() => centerTodayInCalendar())
    }

    window.addEventListener('gamecal:center-today', centerHandler)
    return () => window.removeEventListener('gamecal:center-today', centerHandler)
  }, [ref])

  return (
    <div className="gamecal-calendar relative flex min-h-0 flex-1 flex-col overflow-hidden p-2 md:p-4" data-testid="calendar-grid">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0f0f0f]/50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      <div className={`${selectedDateKey ? 'min-h-[170px] md:min-h-[260px]' : 'min-h-[360px] md:min-h-[420px]'} flex-1 overflow-hidden`}>
        <FullCalendar
          ref={ref}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={false}
          events={calendarEvents}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          datesSet={handleDatesSet}
          firstDay={preferences.week_starts_on}
          weekends={preferences.show_weekends}
          height="100%"
          timeZone={preferences.timezone}
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
            const dateKey = info.el.getAttribute('data-date') ?? format(info.date, 'yyyy-MM-dd')
            info.el.addEventListener('click', (event) => {
              if ((event.target as HTMLElement).closest('.fc-event, .release-cell-art')) return
              if (isGuest) {
                onGuestEventClick()
                return
              }
              setSelectedDateKey(dateKey)
            })
            const release = releasesByDate[dateKey]
            if (release) {
              mountReleaseArt(info.el, release)
            }
          }}
        />
      </div>
      {selectedDateKey && (
        <section
          ref={selectedEventsRef}
          data-testid="selected-date-events"
          className="mt-2 shrink-0 border-t border-zinc-800 bg-[#0f0f0f] pb-28 pt-3 md:mt-3 md:max-h-[34vh] md:pb-0 md:pt-4"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-rajdhani text-2xl font-bold leading-none text-white">
                {formatSelectedDate(selectedDateKey)}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                {selectedDateEvents.length} event{selectedDateEvents.length === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDateKey(null)}
              className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-900 hover:text-white"
              aria-label="Close selected date events"
            >
              Close
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto pr-1 md:max-h-[calc(34vh-76px)]">
            {selectedDateEvents.length > 0 ? (
              <div className="divide-y divide-zinc-800">
                {selectedDateEvents.map((event) => (
                  (() => {
                    const reward = getRewardSignals(event, event.game)
                    const rewardLabel = getRewardBadgeLabel(event)
                    return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      if (isGuest) {
                        onGuestEventClick()
                        return
                      }
                      if (event.game) onEventClick(event, event.game)
                    }}
                    className="grid w-full grid-cols-[4px_56px_1fr_auto] gap-3 py-3 text-left transition-colors hover:bg-zinc-900/60 sm:grid-cols-[4px_64px_1fr_auto] sm:gap-5 md:py-4"
                  >
                    <span
                      className="mt-1 h-full rounded-full"
                      style={{ backgroundColor: event.game?.brand_color ?? '#6366f1' }}
                      aria-hidden="true"
                    />
                    <span
                      className="h-14 w-14 overflow-hidden rounded-md border border-zinc-800 bg-zinc-900 bg-cover bg-center sm:h-16 sm:w-16"
                      style={{
                        backgroundImage: getEventArtUrl(event, event.game)
                          ? `linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.05)), url(${getEventArtUrl(event, event.game)})`
                          : `linear-gradient(135deg, ${event.game?.brand_color ?? '#6366f1'}66, #18181b)`,
                      }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            backgroundColor: `${event.game?.brand_color ?? '#6366f1'}22`,
                            color: event.game?.brand_color ?? '#a5b4fc',
                          }}
                        >
                          {event.game?.name}
                        </span>
                        <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                          {getEventTypeLabel(event.event_type)}
                        </span>
                        {rewardLabel && (
                          <span className="max-w-[14rem] truncate rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            🎁 {reward.reward_score} · {rewardLabel}
                          </span>
                        )}
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getSourceConfidenceTone(reward.source_confidence)}`}>
                          {getSourceConfidenceLabel(reward.source_confidence)}
                        </span>
                      </span>
                      <span className="line-clamp-2 text-sm font-bold leading-tight text-zinc-100">
                        {event.title}
                      </span>
                      <span className="mt-1 line-clamp-1 block text-xs text-zinc-500">
                        {event.game ? getEventFallbackDescription(event, event.game) : event.description}
                      </span>
                    </span>
                    <span className="whitespace-nowrap pt-8 text-sm font-semibold text-zinc-300">
                      {formatTime(event.start_at, preferences.time_format, preferences.timezone)}
                    </span>
                  </button>
                    )
                  })()
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-4 text-sm text-zinc-500">
                No events on this date.
              </p>
            )}
          </div>
        </section>
      )}
      <style jsx global>{`
        .gamecal-calendar {
          --fc-border-color: #27272a;
          --fc-today-bg-color: rgba(99, 102, 241, 0.08);
          --fc-neutral-bg-color: #1a1a1a;
          --fc-page-bg-color: #0f0f0f;
          height: 100%;
          min-height: 0;
        }
        .gamecal-calendar .fc {
          color: #fff;
          height: 100% !important;
        }
        .gamecal-calendar .fc-view-harness {
          height: 100% !important;
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
        .gamecal-calendar .gamecal-selected-day {
          outline: 2px solid rgba(99, 102, 241, 0.75);
          outline-offset: -2px;
          background: linear-gradient(180deg, rgba(99, 102, 241, 0.18), rgba(99, 102, 241, 0.04)) !important;
          box-shadow: inset 0 0 24px rgba(99, 102, 241, 0.16);
        }
        .gamecal-calendar .gamecal-selected-day .fc-daygrid-day-number {
          color: #fff;
          font-weight: 800;
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
        .gamecal-calendar .reward-event {
          box-shadow: inset 3px 0 0 #f59e0b, 0 0 10px rgba(245, 158, 11, 0.2);
        }
        .gamecal-calendar .reward-event::before {
          content: '🎁';
          margin-right: 3px;
          font-size: 10px;
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
