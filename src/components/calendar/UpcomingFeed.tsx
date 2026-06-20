'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePreferences } from '@/hooks/usePreferences'
import type { GameEvent, NewRelease } from '@/types'
import {
  formatShortTime,
  getTimeUntilEnd,
  groupEventsByDay,
  isCurrentlyActive,
  isUpcoming,
  isWithinDays,
} from '@/lib/calendar-dates'
import { getEventTypeIcon } from '@/lib/utils'
import { getReleaseHeroColor } from '@/lib/utils'
import { formatDateKeyInTimezone } from '@/lib/timezone'
import {
  getRewardBadgeLabel,
  getRewardSignals,
  getRewardSortScore,
  getSourceConfidenceLabel,
  getSourceConfidenceTooltip,
} from '@/lib/reward-signals'
import { WORLD_CUP_SLUG } from '@/lib/world-cup-config'

type WorldCupGoal = {
  name: string
  minute?: string
  penalty?: boolean
}

type WorldCupMatchSummary = {
  id: string
  title: string
  startAt: string
  group?: string
  score?: { ft?: [number, number] }
  goals1?: WorldCupGoal[]
  goals2?: WorldCupGoal[]
}

type WorldCupStandingRow = {
  team: string
  played: number
  goalDifference: number
  points: number
}

type WorldCupPulseData = {
  matches: WorldCupMatchSummary[]
  standings: Record<string, WorldCupStandingRow[]>
  cheerTotals: Record<string, number>
}

function formatScorer(goal: WorldCupGoal) {
  return `${goal.name}${goal.minute ? ` ${goal.minute}'` : ''}${goal.penalty ? ' pen' : ''}`
}

function WorldCupPulsePanel({ events }: { events: GameEvent[] }) {
  const [data, setData] = useState<WorldCupPulseData | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetch('/api/world-cup/matches?limit=200').then((res) => (res.ok ? res.json() : null)),
      fetch('/api/roar/cheer?scope=global&limit=80').then((res) => (res.ok ? res.json() : null)).catch(() => null),
    ])
      .then(([payload, cheerPayload]) => {
        if (!cancelled && payload) {
          const cheerTotals = Object.fromEntries(
            ((cheerPayload?.totals ?? []) as Array<{ country: string; total: number }>).map((row) => [
              row.country,
              Number(row.total) || 0,
            ])
          )
          setData({
            matches: payload.matches ?? [],
            standings: payload.standings ?? {},
            cheerTotals,
          })
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  const now = Date.now()
  const nextMatch = useMemo(() => {
    const fromApi = data?.matches
      ?.filter((match) => new Date(match.startAt).getTime() >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0]
    if (fromApi) return fromApi

    const fromEvents = events
      .filter((event) => event.game?.slug === WORLD_CUP_SLUG)
      .filter((event) => new Date(event.start_at).getTime() >= now)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0]
    return fromEvents
      ? {
          id: fromEvents.id,
          title: fromEvents.title,
          startAt: fromEvents.start_at,
          group: String(fromEvents.metadata?.group ?? ''),
        }
      : null
  }, [data?.matches, events, now])

  const recentResults = useMemo(() => {
    return (data?.matches ?? [])
      .filter((match) => match.score?.ft)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
      .slice(0, 2)
  }, [data?.matches])

  const standingsGroups = useMemo(() => {
    const preferredGroup = nextMatch?.group
    const groups = Object.keys(data?.standings ?? {})
    return [
      ...(preferredGroup && data?.standings?.[preferredGroup] ? [preferredGroup] : []),
      ...groups.filter((group) => group !== preferredGroup),
    ].slice(0, 2)
  }, [data?.standings, nextMatch?.group])

  if (!events.some((event) => event.game?.slug === WORLD_CUP_SLUG) && !data?.matches?.length) return null

  return (
    <section className="border-b border-emerald-400/20 bg-emerald-950/20 px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Summer Cup Pulse</div>
          <div className="mt-0.5 line-clamp-1 text-xs font-bold text-white">
            {nextMatch ? `Next: ${nextMatch.title}` : 'Scores, scorers, standings'}
          </div>
        </div>
        <Link
          href={nextMatch ? `/roar?match=${encodeURIComponent(nextMatch.id)}&source=next_up_pulse` : '/roar?source=next_up_pulse'}
          className="shrink-0 rounded-full bg-emerald-400 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-950"
        >
          ROAR
        </Link>
      </div>

      {recentResults.length > 0 && (
        <div className="space-y-2">
          {recentResults.map((match) => {
            const [homeScore, awayScore] = match.score?.ft ?? [0, 0]
            const [homeTeam, awayTeam] = match.title.split(' vs ')
            const goals = [...(match.goals1 ?? []), ...(match.goals2 ?? [])].slice(0, 4)
            return (
              <div key={match.id} className="rounded-md border border-white/10 bg-black/20 p-2">
                <div className="flex items-center justify-between gap-2 text-xs font-bold text-white">
                  <span className="truncate">{homeTeam}</span>
                  <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-emerald-100">
                    {homeScore} - {awayScore}
                  </span>
                  <span className="truncate text-right">{awayTeam}</span>
                </div>
                {goals.length > 0 && (
                  <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-emerald-100/70">
                    Goals: {goals.map(formatScorer).join(', ')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {standingsGroups.length > 0 && (
        <div className="mt-3 space-y-2">
          {standingsGroups.map((group) => (
            <div key={group} className="rounded-md border border-white/10 bg-black/20 p-2">
              <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-emerald-200">{group}</div>
              {(data?.standings[group] ?? []).slice(0, 4).map((row, index) => (
                <div key={row.team} className="grid grid-cols-[18px_1fr_auto_auto] items-center gap-1 text-[10px] text-zinc-300">
                  <span className="font-mono text-zinc-500">{index + 1}</span>
                  <span className="truncate font-semibold text-zinc-100">{row.team}</span>
                  <span className="font-mono text-zinc-500">
                    ROAR {data?.cheerTotals[row.team] ? Intl.NumberFormat().format(data.cheerTotals[row.team]) : '0'}
                  </span>
                  <span className="font-mono font-bold text-emerald-200">{row.points} pts</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

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
          <div className="mt-1 text-[10px] text-zinc-500" title={getSourceConfidenceTooltip(reward.source_confidence)}>
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

function UpcomingReleaseItem({
  release,
  onClick,
}: {
  release: NewRelease
  onClick: () => void
}) {
  const heroColor = release.hero_color ?? getReleaseHeroColor(release.platform)

  return (
    <button
      type="button"
      data-testid={`upcoming-release-${release.id}`}
      onClick={onClick}
      className="group w-full border-b border-indigo-500/10 px-4 py-2.5 text-left transition-colors hover:bg-indigo-500/10"
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-400"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-300">
            NEW / {release.platform.slice(0, 2).join(' · ') || 'Game'}
          </div>
          <div className="line-clamp-2 text-xs font-semibold leading-tight text-zinc-200 group-hover:text-white">
            {release.title}
          </div>
          {release.developer && (
            <div className="mt-0.5 truncate text-[10px] text-zinc-500">{release.developer}</div>
          )}
          {release.description && (
            <div className="mt-1 line-clamp-1 text-[10px] text-zinc-500">{release.description}</div>
          )}
        </div>
        <span
          className="mt-1 h-8 w-8 shrink-0 rounded border border-zinc-800 bg-cover bg-center"
          style={{
            backgroundImage: release.image_url
              ? `linear-gradient(to top, rgba(0,0,0,0.4), transparent), url(${release.image_url})`
              : `linear-gradient(135deg, ${heroColor}88, #18181b)`,
          }}
          aria-hidden="true"
        />
      </div>
    </button>
  )
}

export function UpcomingFeed({
  events,
  onEventClick,
  releases = [],
  onReleaseClick,
}: {
  events: GameEvent[]
  onEventClick: (event: GameEvent) => void
  releases?: NewRelease[]
  onReleaseClick?: (release: NewRelease) => void
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
  const now = new Date()
  const todayKey = formatDateKeyInTimezone(now.toISOString(), preferences.timezone)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = formatDateKeyInTimezone(tomorrow.toISOString(), preferences.timezone)
  const releaseUpcoming = releases
    .filter((release) => isWithinDays(`${release.release_date}T00:00:00Z`, 14))
  const releaseGroups = releaseUpcoming.reduce<Record<string, NewRelease[]>>((acc, release) => {
      const dateIso = `${release.release_date}T00:00:00Z`
      const releaseKey = formatDateKeyInTimezone(dateIso, preferences.timezone)
      const day = releaseKey === todayKey
        ? 'TODAY'
        : releaseKey === tomorrowKey
          ? 'TOMORROW'
          : new Date(dateIso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: preferences.timezone,
      }).toUpperCase()
      acc[day] = [...(acc[day] ?? []), release]
      return acc
    }, {})
  const groupLabels = Array.from(new Set([...Object.keys(groups), ...Object.keys(releaseGroups)]))

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
        <WorldCupPulsePanel events={events} />
        {groupLabels.map((day) => (
          <div key={day}>
            <div className="sticky top-0 border-b border-zinc-800/50 bg-[#111111] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {day}
            </div>
            {(groups[day] ?? []).map((event) => (
              <UpcomingItem
                key={event.id}
                event={event}
                onClick={() => onEventClick(event)}
                timezone={preferences.timezone}
                timeFormat={preferences.time_format}
              />
            ))}
            {(releaseGroups[day] ?? []).map((release) => (
              <UpcomingReleaseItem
                key={release.id}
                release={release}
                onClick={() => onReleaseClick?.(release)}
              />
            ))}
          </div>
        ))}
        {upcoming.length === 0 && releaseUpcoming.length === 0 && (
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
