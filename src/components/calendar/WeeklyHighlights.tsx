'use client'

import { useReleases } from '@/hooks/useReleases'
import type { Game, GameEvent, NewRelease } from '@/types'
import {
  getEventTypeIcon,
  getEventTypeLabel,
  getGameTextColor,
} from '@/lib/utils'
import { formatShortDate, getDday, isThisWeek } from '@/lib/calendar-dates'
import { getEventArtUrl, getGameArtStyle } from '@/lib/game-art'

function HighlightCard({
  event,
  game,
  onClick,
}: {
  event: GameEvent
  game: Game
  onClick: () => void
}) {
  const artUrl = getEventArtUrl(event, game)
  const bgStyle = artUrl
    ? {
        backgroundImage: `url(${artUrl})`,
        backgroundSize: 'cover' as const,
        backgroundPosition: 'center' as const,
      }
    : getGameArtStyle(game)

  const barColor = event.importance === 'critical' ? '#ef4444' : game.brand_color

  return (
    <button
      type="button"
      data-testid={`highlight-card-${event.id}`}
      onClick={onClick}
      className="group relative h-40 w-60 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-zinc-800 transition-all duration-200 hover:scale-[1.02] hover:border-zinc-600"
    >
      <div className="absolute inset-0" style={bgStyle} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      <div
        className="absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
        style={{
          backgroundColor: `${game.brand_color}30`,
          color: getGameTextColor(game.brand_color),
          border: `1px solid ${game.brand_color}50`,
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: game.brand_color }} />
        {game.name}
      </div>

      <div className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
        {getDday(event.start_at)}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 px-3 py-2.5"
        style={{
          borderTop: `2px solid ${barColor}`,
          background: 'linear-gradient(0deg, #000 0%, transparent 100%)',
        }}
      >
        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: barColor }}>
          {getEventTypeIcon(event.event_type)} {getEventTypeLabel(event.event_type)}
        </div>
        <div className="line-clamp-2 text-sm font-bold leading-tight text-white">{event.title}</div>
        <div className="mt-0.5 text-[10px] text-zinc-400">{formatShortDate(event.start_at)}</div>
      </div>
    </button>
  )
}

function ReleaseHighlightCard({
  release,
  onClick,
}: {
  release: NewRelease
  onClick: () => void
}) {
  const bgStyle = release.image_url
    ? {
        backgroundImage: `url(${release.image_url})`,
        backgroundSize: 'cover' as const,
        backgroundPosition: 'center' as const,
      }
    : { background: `linear-gradient(135deg, ${release.hero_color ?? '#1b2838'} 0%, #0f0f0f 100%)` }

  return (
    <button
      type="button"
      data-testid={`highlight-release-${release.id}`}
      onClick={onClick}
      className="group relative h-40 w-60 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-zinc-800 transition-all duration-200 hover:scale-[1.02] hover:border-zinc-600"
    >
      <div className="absolute inset-0" style={bgStyle} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute left-2 top-2 rounded-full border border-indigo-400/40 bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-200">
        NEW / {release.platform[0] ?? 'Game'}
      </div>
      <div className="absolute bottom-0 left-0 right-0 border-t-2 border-indigo-400 bg-gradient-to-t from-black to-black/20 px-3 py-2.5">
        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
          New Release
        </div>
        <div className="line-clamp-2 text-sm font-bold leading-tight text-white">{release.title}</div>
        <div className="mt-0.5 text-[10px] text-zinc-400">{release.release_date}</div>
      </div>
    </button>
  )
}

export function WeeklyHighlights({
  events,
  onEventClick,
  onReleaseClick,
}: {
  events: GameEvent[]
  onEventClick: (event: GameEvent, game: Game) => void
  onReleaseClick?: (release: NewRelease) => void
}) {
  const { releases } = useReleases()
  const highlights = events
    .filter((e) => e.game && (isThisWeek(e.start_at) || new Date(e.start_at) > new Date()))
    .sort((a, b) => (a.importance === 'critical' ? 0 : 1) - (b.importance === 'critical' ? 0 : 1))
    .slice(0, Math.max(0, 8 - releases.length))
  const releaseHighlights = releases.slice(0, Math.max(0, 8 - highlights.length))

  if (!highlights.length && !releaseHighlights.length) return null

  return (
    <div data-testid="weekly-highlights" className="shrink-0 border-b border-zinc-800 px-4 py-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-bold text-white">🔥 THIS WEEK</span>
        <span className="text-xs text-zinc-500">— {highlights.length + releaseHighlights.length} major events</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {highlights.map((e) => (
          <HighlightCard
            key={e.id}
            event={e}
            game={e.game!}
            onClick={() => onEventClick(e, e.game!)}
          />
        ))}
        {releaseHighlights.map((release) => (
          <ReleaseHighlightCard
            key={release.id}
            release={release}
            onClick={() => onReleaseClick?.(release)}
          />
        ))}
      </div>
    </div>
  )
}
