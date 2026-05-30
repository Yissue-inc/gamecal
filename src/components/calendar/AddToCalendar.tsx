'use client'
import { Calendar, ChevronDown, Download, Mail, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { withGamerClockUtm } from '@/lib/utils'
import type { Game, GameEvent, NewRelease } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gamecal-beryl.vercel.app'
const APP_HOST = (() => {
  try {
    return new URL(APP_URL).host
  } catch {
    return 'gamecal-beryl.vercel.app'
  }
})()

interface AddToCalendarProps {
  event: GameEvent
  game: Game
}

function toGoogleDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function toGoogleAllDay(date: string): string {
  return date.replace(/-/g, '')
}

function addOneDay(date: string): string {
  const next = new Date(`${date}T00:00:00.000Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

function buildReleaseIcs(release: NewRelease): string {
  const start = toGoogleAllDay(release.release_date)
  const end = toGoogleAllDay(addOneDay(release.release_date))
  const sourceUrl = release.steam_url ?? release.nintendo_url ?? `${APP_URL}/new-releases`
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GamerClock//New Release//EN',
    'BEGIN:VEVENT',
    `UID:gamerclock-release-${release.id}@${APP_HOST}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeIcs(`NEW / ${release.title}`)}`,
    `DESCRIPTION:${escapeIcs(release.description ?? 'Tracked by GamerClock.')}`,
    `URL:${escapeIcs(sourceUrl)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function AddToCalendar({ event, game }: AddToCalendarProps) {
  const start = toGoogleDate(event.start_at)
  const end = toGoogleDate(event.end_at ?? event.start_at)
  const title = encodeURIComponent(`[${game.name}] ${event.title}`)
  const details = encodeURIComponent(event.description ?? '')

  const location = encodeURIComponent(typeof window !== 'undefined' ? window.location.host : APP_HOST)
  const googleUrl = withGamerClockUtm(
    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`,
    'add_to_calendar'
  )
  const outlookUrl = withGamerClockUtm(
    `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${encodeURIComponent(event.start_at)}&enddt=${encodeURIComponent(event.end_at ?? event.start_at)}&body=${details}`,
    'add_to_calendar'
  )
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

export function AddReleaseToCalendar({ release }: { release: NewRelease }) {
  const title = encodeURIComponent(`NEW / ${release.title}`)
  const details = encodeURIComponent(release.description ?? 'Tracked by GamerClock.')
  const start = toGoogleAllDay(release.release_date)
  const end = toGoogleAllDay(addOneDay(release.release_date))
  const sourceUrl = release.steam_url ?? release.nintendo_url ?? `${APP_URL}/new-releases`
  const googleUrl = withGamerClockUtm(
    `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${encodeURIComponent(sourceUrl)}`,
    'add_release_to_calendar'
  )
  const outlookUrl = withGamerClockUtm(
    `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${encodeURIComponent(`${release.release_date}T09:00:00.000Z`)}&enddt=${encodeURIComponent(`${release.release_date}T10:00:00.000Z`)}&body=${details}`,
    'add_release_to_calendar'
  )
  const icsUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(buildReleaseIcs(release))}`
  const items = [
    {
      href: googleUrl,
      testId: 'release-google-calendar-link',
      label: 'Google Calendar',
      icon: Plus,
      external: true,
    },
    {
      href: outlookUrl,
      testId: 'release-outlook-calendar-link',
      label: 'Outlook Calendar',
      icon: Mail,
      external: true,
    },
    {
      href: icsUrl,
      testId: 'release-ical-download-link',
      label: 'Apple Calendar / ICS',
      icon: Download,
      download: `${release.title}.ics`,
    },
  ]

  return (
    <div data-testid="release-add-to-calendar-section">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button data-testid="release-add-to-calendar-btn" variant="outline" className="w-full justify-between border-zinc-700">
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
