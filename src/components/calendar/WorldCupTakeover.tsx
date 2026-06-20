'use client'

import Link from 'next/link'
import { Trophy, CalendarDays, Gamepad2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GameEvent } from '@/types'

function nextWorldCupMatch(events: GameEvent[]): GameEvent | null {
  const now = Date.now()
  return events
    .filter((event) => event.game?.slug === 'world-cup')
    .filter((event) => new Date(event.end_at ?? event.start_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0] ?? null
}

export function WorldCupTakeover({ events }: { events: GameEvent[] }) {
  const nextMatch = nextWorldCupMatch(events)

  return (
    <section
      data-theme="stadium"
      data-testid="world-cup-takeover"
      className="relative shrink-0 overflow-hidden border-b border-[color:var(--acc2)]/20 bg-[color:var(--bg)]"
    >
      <div
        className="absolute inset-0 opacity-55"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(4,18,12,0.98) 0%, rgba(4,18,12,0.78) 45%, rgba(4,18,12,0.45) 100%), url(/world-cup-hero-stadium.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />

      <div className="relative mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-amber-300/40 bg-amber-300/10 md:flex">
            <Trophy className="h-6 w-6 text-amber-200" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">
                Summer Cup Mode
              </span>
              <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55 sm:inline">
                Live through July
              </span>
            </div>
            <h2 className="mt-1 truncate font-rajdhani text-xl font-black tracking-tight text-white md:text-2xl">
              ROAR with every Summer Cup match
            </h2>
            <p className="mt-0.5 truncate text-xs text-emerald-50/70 md:text-sm">
              {nextMatch ? `Next: ${nextMatch.title}` : 'All Summer Cup fixtures are now on the calendar.'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button asChild size="sm" className="hidden bg-emerald-400 text-emerald-950 hover:bg-emerald-300 sm:inline-flex">
            <Link href={nextMatch ? `/roar?match=${encodeURIComponent(nextMatch.id)}&source=home_takeover` : '/roar?source=home_takeover'}>
              <Gamepad2 className="mr-1.5 h-4 w-4" />
              Play ROAR
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="border-white/20 bg-black/25 text-white hover:bg-white/10">
            <a href="/api/feed/world-cup" target="_blank" rel="noopener noreferrer">
              <CalendarDays className="mr-1.5 h-4 w-4" />
              Follow
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
