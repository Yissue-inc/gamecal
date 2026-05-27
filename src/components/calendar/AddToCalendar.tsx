'use client'
import { Calendar, ChevronDown, Download, Mail, Plus } from 'lucide-react'
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

  const location = encodeURIComponent(typeof window !== 'undefined' ? window.location.host : 'gamecal-beryl.vercel.app')
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`
  const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${encodeURIComponent(event.start_at)}&enddt=${encodeURIComponent(event.end_at ?? event.start_at)}&body=${details}`
  const icsUrl = `/api/events/${event.id}/ics`
  const items = [
    {
      href: googleUrl,
      testId: 'google-calendar-link',
      label: 'Google Calendar',
      icon: Plus,
      external: true,
    },
    {
      href: outlookUrl,
      testId: 'outlook-calendar-link',
      label: 'Outlook Calendar',
      icon: Mail,
      external: true,
    },
    {
      href: icsUrl,
      testId: 'ical-download-link',
      label: 'Apple Calendar / ICS',
      icon: Download,
      download: `${event.title}.ics`,
    },
  ]

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
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-md border-zinc-700 bg-zinc-900 p-1">
          {items.map(({ href, testId, label, icon: Icon, external, download }) => (
            <DropdownMenuItem key={testId} asChild>
              <a
                href={href}
                data-testid={testId}
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                download={download}
                className="flex min-h-10 items-center gap-3 rounded-sm px-3 text-sm"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded border border-zinc-700 bg-zinc-800 text-zinc-200">
                  <Icon className="h-4 w-4" />
                </span>
                <span>{label}</span>
              </a>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
