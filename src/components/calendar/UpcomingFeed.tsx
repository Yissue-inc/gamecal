'use client'

import { usePreferences } from '@/hooks/usePreferences'
import type { GameEvent } from '@/types'
import {
  formatShortTime,
  getTimeUntilEnd,
  groupEventsByDay,
  isCurrentlyActive,
  isUpcoming,
  isWithinDays,
} from '@/lib/calendar-dates'
import { getEventTypeIcon } from '@/lib/utils'
import { formatDateKeyInTimezone } from '@/lib/timezone'
import {
  getRewardBadgeLabel,
  getRewardSignals,
  getRewardSortScore,
  getSourceConfidenceLabel,
} from '@/lib/reward-signals'

function UpcomingItem({
  event,
  onClick,
  timezone,
  timeFormat,
}: {
  event: GameEvent
  onClick: () => void
  timezone: string
  timeFormat: '12h' | '24h'
}) {
  const isLive = isCurrentlyActive(event)
  const game = event.game!
  const rewardLabel = getRewardBadgeLabel(event)
  const reward = getRewardSignals(event, game)

  return (
    <button
      type="button"
      data-testid={`upcoming-item-${event.id}`}
      onClick={onClick}
      className="group w-full border-b border-zinc-800/30 px-4 py-2.5 text-left transition-colors hover:bg-zinc-800/50"
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-1 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: game.brand_color }}
        />
        <div className="min-w-0 flex-1">
          {isLive ? (
            <div className="mb-0.5 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              <span className="text-[10px] font-bold text-red-400">LIVE NOW</span>
            </div>
          ) : (
            <div className="mb-0.5 text-[10px] text-zinc-500">
              {getEventTypeIcon(event.event_type)} {formatShortTime(event.start_at, timezone, timeFormat)}
            </div>
          )}
          <div className="line-clamp-2 text-xs font-semibold leading-tight text-zinc-200 group-hover:text-white">
            {event.title}
          </div>
          <div className="mt-0.5 text-[10px] font-medium" style={{ color: game.brand_color }}>
            {game.name}
          </div>
          {rewardLabel && (
            <div className="mt-1 line-clamp-1 text-[10px] font-semibold text-amber-300">
              🎁 {reward.reward_score} · {rewardLabel}
            </div>
          )}
          <div className="mt-1 text-[10px] text-zinc-600">
            {getSourceConfidenceLabel(reward.source_confidence)}
          </div>
        </div>
        {event.importance === 'critical' && (
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
        )}
      </div>
    </button>
  )
}

export function UpcomingFeed({
  events,
  onEventClick,
}: {
  events: GameEvent[]
  onEventClick: (event: GameEvent) => void
}) {
  const { preferences } = usePreferences()
  const upcoming = events
    .filter((e) => e.game && (isUpcoming(e.start_at) || isCurrentlyActive(e)) && isWithinDays(e.start_at, 14))
    .sort((a, b) => {
      const dayOrder = new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      if (Math.abs(dayOrder) > 1000 * 60 * 60 * 24) return dayOrder
      const rewardOrder = getRewardSortScore(b) - getRewardSortScore(a)
      if (rewardOrder !== 0) return rewardOrder
      return dayOrder
    })

  const groups = groupEventsByDay(upcoming, preferences.timezone)

  return (
    <aside
      data-testid="upcoming-feed"
      className="flex w-60 shrink-0 flex-col overflow-hidden border-l border-zinc-800 bg-[#111111]"
    >
      <div className="flex items-center gap-1.5 border-b border-zinc-800 px-4 py-3">
        <span className="text-sm font-black tracking-wider text-white">NEXT UP</span>
        <span className="text-sm text-yellow-400">⚡</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groups).map(([day, dayEvents]) => (
          <div key={day}>
            <div className="sticky top-0 border-b border-zinc-800/50 bg-[#111111] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {day}
            </div>
            {dayEvents.map((event) => (
              <UpcomingItem
                key={event.id}
                event={event}
                onClick={() => onEventClick(event)}
                timezone={preferences.timezone}
                timeFormat={preferences.time_format}
              />
            ))}
          </div>
        ))}
        {upcoming.length === 0 && (
          <p className="p-4 text-xs text-zinc-500">No upcoming events in the next 14 days.</p>
        )}
      </div>
    </aside>
  )
}

export function LiveBanner({
  events,
  onEventClick,
}: {
  events: GameEvent[]
  onEventClick: (event: GameEvent) => void
}) {
  const { preferences } = usePreferences()
  const now = new Date()
  const todayKey = formatDateKeyInTimezone(now.toISOString(), preferences.timezone)
  const liveEvents = events.filter((event) => {
    if (!event.game) return false
    if (isCurrentlyActive(event)) return true
    if (event.end_at) return false

    const start = new Date(event.start_at)
    if (Number.isNaN(start.getTime()) || start > now) return false
    return formatDateKeyInTimezone(event.start_at, preferences.timezone) === todayKey
  })

  const fallbackEvents = events
    .filter((event) => event.game && isUpcoming(event.start_at))
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, 3)
  const displayEvents = liveEvents.length ? liveEvents : fallbackEvents
  const marqueeEvents = displayEvents.length > 1 ? [...displayEvents, ...displayEvents] : displayEvents

  return (
    <div
      data-testid="live-now-banner"
      className="mt-1 flex items-center gap-3 overflow-hidden border-y border-red-900/50 bg-red-950/50 px-4 py-2.5"
    >
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-red-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        LIVE NOW
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        {displayEvents.length === 0 ? (
          <span className="text-xs text-zinc-500">No live events right now</span>
        ) : (
        <div
          className={displayEvents.length > 1 ? 'live-now-marquee flex w-max gap-8' : 'flex gap-3'}
        >
        {marqueeEvents.map((e, index) => (
          <button
            key={`${e.id}-${index}`}
            type="button"
            data-testid={`live-event-${e.id}`}
            onClick={() => onEventClick(e)}
            className="whitespace-nowrap text-xs text-zinc-300 hover:text-white"
          >
            <span style={{ color: e.game?.brand_color }}>● {e.game?.name}</span>
            {' '}— {e.title}
            {' '}
            <span className="text-zinc-500">
              {liveEvents.length
                ? e.end_at ? `ends ${getTimeUntilEnd(e.end_at)}` : 'live today'
                : 'next up'}
            </span>
          </button>
        ))}
        </div>
        )}
      </div>
      <style jsx>{`
        .live-now-marquee {
          animation: live-now-scroll 34s linear infinite;
        }
        .live-now-marquee:hover {
          animation-play-state: paused;
        }
        @keyframes live-now-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
