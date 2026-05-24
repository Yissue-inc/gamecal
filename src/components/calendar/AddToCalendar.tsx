'use client'

import { toast } from 'sonner'
import { Calendar, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Game, GameEvent } from '@/types'

interface AddToCalendarProps {
  event: GameEvent
  game: Game
}

function toGoogleDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function AddToCalendar({ event, game }: AddToCalendarProps) {
  const start = toGoogleDate(event.start_at)
  const end = toGoogleDate(event.end_at ?? event.start_at)
  const title = encodeURIComponent(`[${game.name}] ${event.title}`)
  const details = encodeURIComponent(event.description ?? '')

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=gamecal.io`
  const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${encodeURIComponent(event.start_at)}&enddt=${encodeURIComponent(event.end_at ?? event.start_at)}&body=${details}`
  const icsUrl = `/api/events/${event.id}/ics`

  return (
    <div data-testid="add-to-calendar-section">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button data-testid="add-to-calendar-btn" variant="outline" className="w-full justify-between border-zinc-700">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Add to Calendar
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
          <DropdownMenuItem asChild>
            <a href={googleUrl} data-testid="google-calendar-link" target="_blank" rel="noopener noreferrer">
              G Google Calendar
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={outlookUrl} data-testid="outlook-calendar-link" target="_blank" rel="noopener noreferrer">
              📧 Outlook
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={icsUrl} data-testid="ical-download-link" download={`${event.title}.ics`}>
              🍎 iCal
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
