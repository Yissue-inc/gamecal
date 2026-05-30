'use client'

import type { Game, GameEvent, NewRelease } from '@/types'
import {
  getEventTypeIcon,
  getEventTypeLabel,
  getGameTextColor,
} from '@/lib/utils'
import { formatShortDate, getDday, isThisWeek } from '@/lib/calendar-dates'
import { getEventArtUrl, getGameArtStyle } from '@/lib/game-art'
import {
  getRewardBadgeLabel,
  getRewardSignals,
  getRewardSortScore,
  getSourceConfidenceLabel,
  getSourceConfidenceTone,
} from '@/lib/reward-signals'

function HighlightCard({
  event,
  game,
  onClick,
  className = '',
}: {
  event: GameEvent
  game: Game
  onClick: () => void
  className?: string
}) {
  const artUrl = getEventArtUrl(event, game)
  const bgStyle = artUrl
    ? {
        backgroundImage: `url(${artUrl})`,
        backgroundSize: 'cover' as const,
        backgroundPosition: 'center' as const,
      }
    : getGameArtStyle(game)

  const reward = getRewardSignals(event, game)
  const rewardLabel = getRewardBadgeLabel(event)

  return (
    <button
      type="button"
      data-testid={`highlight-card-${event.id}`}
      onClick={onClick}
      className={`group relative h-32 w-52 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-zinc-800 transition-all duration-200 hover:scale-[1.02] hover:border-zinc-600 md:h-40 md:w-60 ${className}`}
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

      <div className={`absolute right-2 top-9 hidden rounded-full border px-2 py-0.5 text-[9px] font-bold md:block ${getSourceConfidenceTone(reward.source_confidence)}`}>
        {reward.source_confidence === 'official' ? 'Official' : reward.source_confidence === 'media' ? 'Media' : 'Inferred'}
      </div>

      {rewardLabel && (
        <div className="absolute left-2 top-9 rounded-full border border-amber-400/40 bg-black/55 px-2 py-0.5 text-[10px] font-bold text-amber-200">
          🎁 {reward.reward_score}
        </div>
      )}

      <div
        className="absolute bottom-0 left-0 right-0 px-3 py-2.5"
        style={{
          background: 'linear-gradient(0deg, #000 0%, transparent 100%)',
        }}
      >
        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
          {getEventTypeIcon(event.event_type)} {getEventTypeLabel(event.event_type)}
        </div>
        <div className="line-clamp-2 text-sm font-bold leading-tight text-white">{event.title}</div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-zinc-400">
          <span>{formatShortDate(event.start_at)}</span>
          <span className="hidden truncate md:inline">{getSourceConfidenceLabel(reward.source_confidence)}</span>
        </div>
      </div>
    </button>
  )
}

function ReleaseHighlightCard({
  release,
  onClick,
  className = '',
}: {
  release: NewRelease
  onClick: () => void
  className?: string
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
      className={`group relative h-32 w-52 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-zinc-800 transition-all duration-200 hover:scale-[1.02] hover:border-zinc-600 md:h-40 md:w-60 ${className}`}
    >
      <div className="absolute inset-0" style={bgStyle} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute left-2 top-2 rounded-full border border-indigo-400/40 bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-200">
        NEW / {release.platform[0] ?? 'Game'}
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-black/20 px-3 py-2.5">
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
  releases,
  onEventClick,
  onReleaseClick,
}: {
  events: GameEvent[]
  releases: NewRelease[]
  onEventClick: (event: GameEvent, game: Game) => void
  onReleaseClick?: (release: NewRelease) => void
}) {
  const eventLimit = releases.length > 0 ? 4 : 8
  const highlights = events
    .filter((e) => e.game && (isThisWeek(e.start_at) || new Date(e.start_at) > new Date()))
    .sort((a, b) => {
      const rewardOrder = getRewardSortScore(b) - getRewardSortScore(a)
      if (rewardOrder !== 0) return rewardOrder
      const criticalOrder = (a.importance === 'critical' ? 0 : 1) - (b.importance === 'critical' ? 0 : 1)
      if (criticalOrder !== 0) return criticalOrder
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    })
    .slice(0, eventLimit)
  const releaseHighlights = releases.slice(0, Math.max(0, 8 - highlights.length))

  if (!highlights.length && !releaseHighlights.length) return null

  return (
    <div data-testid="weekly-highlights" className="shrink-0 border-b border-zinc-800 px-3 py-2 md:px-4 md:py-3">
      <div className="mb-2 flex items-center gap-2 md:mb-3">
        <span className="text-sm font-bold text-white">🔥 THIS WEEK</span>
        <span className="text-xs text-zinc-500">— {highlights.length + releaseHighlights.length} major events</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {highlights.map((e, index) => (
          <HighlightCard
            key={e.id}
            event={e}
            game={e.game!}
            onClick={() => onEventClick(e, e.game!)}
            className={index >= 4 ? 'max-md:hidden' : ''}
          />
        ))}
        {releaseHighlights.map((release, index) => (
          <ReleaseHighlightCard
            key={release.id}
            release={release}
            onClick={() => onReleaseClick?.(release)}
            className={highlights.length + index >= 4 ? 'max-md:hidden' : ''}
          />
        ))}
      </div>
    </div>
  )
}
