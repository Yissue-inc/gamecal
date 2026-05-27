'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, ExternalLink, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { AddToCalendar } from '@/components/calendar/AddToCalendar'
import { ShareEvent } from '@/components/calendar/ShareEvent'
import { WishlistButton } from '@/components/wishlist/WishlistButton'
import { ReminderPicker } from '@/components/wishlist/ReminderPicker'
import {
  formatDateRange,
  formatTimeRange,
  getGamerCountdown,
  getEventTypeLabel,
  getImportanceEmoji,
} from '@/lib/utils'
import { getTrackingCount } from '@/lib/push'
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

  return (
    <div className="flex h-full flex-col">
      <div
        data-testid="event-panel-hero"
        className="relative h-32 shrink-0 bg-cover bg-center"
        style={{
          backgroundImage: event.image_url
            ? `url(${event.image_url})`
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

        {event.description && (
          <p data-testid="event-description" className="text-sm leading-relaxed text-zinc-400">{event.description}</p>
        )}

        <AddToCalendar event={event} game={game} />
        <ShareEvent event={event} game={game} />

        {event.source_url && (
          <Button variant="outline" className="w-full border-zinc-700" asChild>
            <Link href={event.source_url} data-testid="official-source-link" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Official Source
            </Link>
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
