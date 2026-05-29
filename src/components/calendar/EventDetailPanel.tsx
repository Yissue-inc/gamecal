'use client'

import { useEffect, useState } from 'react'
import { X, ExternalLink, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { AddToCalendar } from '@/components/calendar/AddToCalendar'
import { ShareEvent } from '@/components/calendar/ShareEvent'
import { PartyButton } from '@/components/calendar/PartyButton'
import { WishlistButton } from '@/components/wishlist/WishlistButton'
import { ReminderPicker } from '@/components/wishlist/ReminderPicker'
import {
  formatDateRange,
  formatTimeRange,
  getGamerCountdown,
  getEventTypeLabel,
  getImportanceEmoji,
  withGamerClockUtm,
} from '@/lib/utils'
import { getEventArtUrl, getEventFallbackDescription } from '@/lib/game-art'
import { getTrackingCount } from '@/lib/push'
import {
  getRewardSignals,
  getSourceConfidenceLabel,
  getSourceConfidenceTone,
} from '@/lib/reward-signals'
import { usePreferences } from '@/hooks/usePreferences'
import type { Game, GameEvent } from '@/types'

interface EventDetailPanelProps {
  event: GameEvent | null
  game: Game | null
  isOpen: boolean
  onClose: () => void
  overlay?: boolean
}

function EventDetailContent({ event, game, onClose }: { event: GameEvent; game: Game; onClose: () => void }) {
  const { preferences } = usePreferences()
  const artUrl = getEventArtUrl(event, game)
  const description = getEventFallbackDescription(event, game)
  const reward = getRewardSignals(event, game)

  return (
    <div className="flex h-full flex-col">
      <div
        data-testid="event-panel-hero"
        className="relative h-32 shrink-0 bg-cover bg-center"
        style={{
          backgroundImage: event.image_url
            ? `url(${event.image_url})`
            : artUrl
              ? `url(${artUrl})`
            : `linear-gradient(135deg, ${game.brand_color}55 0%, #1a1a2e 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/40 to-transparent" />
        <Button
          data-testid="close-event-panel"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 bg-black/40"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <div
            data-testid="event-game-icon"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
            style={{ backgroundColor: `${game.brand_color}66`, color: game.brand_color }}
          >
            {game.name[0]}
          </div>
          <span data-testid="event-game-name" className="text-sm font-medium text-zinc-200">{game.name}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <h2 data-testid="event-title" className="text-2xl font-bold leading-tight">{event.title}</h2>

        <div className="flex flex-wrap items-center gap-2">
          <Badge data-testid="event-type-badge" variant="secondary" className="uppercase">
            {getImportanceEmoji(event.importance)} {getEventTypeLabel(event.event_type)}
          </Badge>
          {reward.reward_score >= 45 && reward.reward_type !== 'none' && (
            <Badge data-testid="event-reward-badge" variant="outline" className="border-amber-500/50 text-amber-300">
              🎁 {reward.reward_score} · {reward.reward_summary}
            </Badge>
          )}
          <Badge
            data-testid="event-source-confidence"
            variant="outline"
            className={getSourceConfidenceTone(reward.source_confidence)}
          >
            {getSourceConfidenceLabel(reward.source_confidence)}
          </Badge>
          <Badge data-testid="event-countdown" variant="outline">
            ⏳ {getGamerCountdown(event.start_at, event.end_at)}
          </Badge>
        </div>

        <div data-testid="tracking-counter" className="text-xs text-zinc-500">
          👁 {getTrackingCount(event.id).toLocaleString()} gamers tracking this event
        </div>

        <div className="flex flex-wrap gap-2">
          <WishlistButton eventId={event.id} />
        </div>

        <ReminderPicker eventId={event.id} eventStartAt={event.start_at} />

        <div className="space-y-2 text-sm">
          <div data-testid="event-date-range" className="flex items-center gap-2 text-zinc-300">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {formatDateRange(event.start_at, event.end_at)}
          </div>
          <div data-testid="event-time-range" className="flex items-center gap-2 text-zinc-300">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {formatTimeRange(event.start_at, event.end_at, preferences.time_format, preferences.timezone)}
          </div>
        </div>

        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Event Details</div>
          <p data-testid="event-description" className="text-sm leading-relaxed text-zinc-300">{description}</p>
        </section>

        {reward.reward_score >= 45 && reward.reward_type !== 'none' && (
          <section data-testid="event-reward-section" className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300">Reward Signal</div>
              <div className="rounded-full bg-black/30 px-2 py-0.5 text-xs font-bold text-amber-200">
                {reward.reward_score}/100
              </div>
            </div>
            <p className="text-sm font-semibold text-zinc-100">{reward.reward_summary}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-zinc-400">
              <span>{reward.reward_type.replace(/_/g, ' ')}</span>
              <span>·</span>
              <span>{reward.reward_rarity.replace(/_/g, ' ')}</span>
              <span>·</span>
              <span>{getSourceConfidenceLabel(reward.source_confidence)}</span>
            </div>
          </section>
        )}

        <section data-testid="event-source-section" className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">Source Confidence</div>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${getSourceConfidenceTone(reward.source_confidence)}`}>
              {getSourceConfidenceLabel(reward.source_confidence)}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-zinc-400">
            {reward.source_confidence === 'official'
              ? 'This event is linked to an official game or publisher source.'
              : reward.source_confidence === 'media'
                ? 'This event is backed by a media or store source and should be reviewed as source coverage evolves.'
                : 'This event is inferred from event type and keyword signals until a stronger source is attached.'}
          </p>
        </section>

        <PartyButton event={event} game={game} />
        <AddToCalendar event={event} game={game} />
        <ShareEvent event={event} game={game} />

        {event.source_url && (
          <Button variant="outline" className="w-full border-zinc-700" asChild>
            <a
              href={withGamerClockUtm(event.source_url, 'official_source')}
              data-testid="official-source-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {reward.source_confidence === 'official' ? 'Official Source' : 'View Source'}
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return isMobile
}

export function EventDetailPanel({ event, game, isOpen, onClose, overlay }: EventDetailPanelProps) {
  const isMobile = useIsMobileViewport()

  if (!event || !game) return null

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" hideClose className="h-[85vh]" data-testid="event-panel">
          <EventDetailContent event={event} game={game} onClose={onClose} />
        </SheetContent>
      </Sheet>
    )
  }

  const positionClass = overlay
    ? 'absolute right-0 top-0 z-50 h-full'
    : 'fixed right-0 top-14 z-50 h-[calc(100vh-3.5rem)]'

  return (
    <div
      data-testid="event-panel"
      className={`${positionClass} w-[380px] border-l border-zinc-800 bg-[#1a1a1a] shadow-2xl transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
      }`}
    >
      <EventDetailContent event={event} game={game} onClose={onClose} />
    </div>
  )
}
