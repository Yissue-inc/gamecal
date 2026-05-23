'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, ExternalLink, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { AddToCalendar } from '@/components/calendar/AddToCalendar'
import {
  formatDateRange,
  formatTimeRange,
  getCountdown,
  getEventTypeLabel,
  getImportanceEmoji,
} from '@/lib/utils'
import { usePreferences } from '@/hooks/usePreferences'
import type { Game, GameEvent } from '@/types'

interface EventDetailPanelProps {
  event: GameEvent | null
  game: Game | null
  isOpen: boolean
  onClose: () => void
}

function EventDetailContent({ event, game, onClose }: { event: GameEvent; game: Game; onClose: () => void }) {
  const { preferences } = usePreferences()
  const endDate = event.end_at ?? event.start_at

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <span className="text-sm text-muted-foreground">Event Details</span>
        <Button data-testid="close-event-panel" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div
            data-testid="event-game-icon"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold"
            style={{ backgroundColor: `${game.brand_color}33`, color: game.brand_color }}
          >
            {game.name[0]}
          </div>
          <span data-testid="event-game-name" className="text-sm text-muted-foreground">{game.name}</span>
        </div>

        <h2 data-testid="event-title" className="text-2xl font-bold leading-tight">{event.title}</h2>

        <div className="flex flex-wrap items-center gap-2">
          <Badge data-testid="event-type-badge" variant="secondary" className="uppercase">
            {getImportanceEmoji(event.importance)} {getEventTypeLabel(event.event_type)}
          </Badge>
          <Badge data-testid="event-countdown" variant="outline">⏱ {getCountdown(endDate)}</Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div data-testid="event-date-range" className="flex items-center gap-2 text-zinc-300">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {formatDateRange(event.start_at, event.end_at)}
          </div>
          <div data-testid="event-time-range" className="flex items-center gap-2 text-zinc-300">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {formatTimeRange(event.start_at, event.end_at, preferences.time_format)}
          </div>
        </div>

        {event.description && (
          <p data-testid="event-description" className="text-sm leading-relaxed text-zinc-400">{event.description}</p>
        )}

        <AddToCalendar event={event} game={game} />

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

export function EventDetailPanel({ event, game, isOpen, onClose }: EventDetailPanelProps) {
  const isMobile = useIsMobileViewport()

  if (!event || !game) return null

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="h-[85vh]" data-testid="event-panel">
          <EventDetailContent event={event} game={game} onClose={onClose} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      data-testid="event-panel"
      className={`fixed right-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-[380px] border-l border-zinc-800 bg-[#1a1a1a] transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <EventDetailContent event={event} game={game} onClose={onClose} />
    </div>
  )
}
