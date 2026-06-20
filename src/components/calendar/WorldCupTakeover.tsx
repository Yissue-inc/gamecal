'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Trophy, CalendarDays, Gamepad2, Flame, Medal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GameEvent } from '@/types'

function nextWorldCupMatch(events: GameEvent[]): GameEvent | null {
  const now = Date.now()
  return events
    .filter((event) => event.game?.slug === 'world-cup')
    .filter((event) => new Date(event.end_at ?? event.start_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0] ?? null
}

function formatCountdown(event: GameEvent | null) {
  if (!event) return 'Fixtures live now'
  const diff = new Date(event.start_at).getTime() - Date.now()
  if (diff <= 0) return 'Live now'
  const hours = Math.floor(diff / 36e5)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h to kickoff`
  return `${hours}h ${Math.floor((diff % 36e5) / 6e4)}m to kickoff`
}

function extractTeams(event: GameEvent | null) {
  if (!event) return ['Team A', 'Team B']
  const metadata = event.metadata ?? {}
  const team1 = typeof metadata.team1 === 'string' ? metadata.team1 : event.title.split(' vs ')[0] ?? 'Team A'
  const team2 = typeof metadata.team2 === 'string' ? metadata.team2 : event.title.split(' vs ')[1] ?? 'Team B'
  return [team1, team2]
}

function upcomingFixtures(events: GameEvent[]) {
  const now = Date.now()
  return events
    .filter((event) => event.game?.slug === 'world-cup')
    .filter((event) => new Date(event.end_at ?? event.start_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, 5)
}

function flagFor(country: string) {
  const codes: Record<string, string> = {
    Argentina: '🇦🇷',
    Brazil: '🇧🇷',
    England: '🏴',
    France: '🇫🇷',
    Germany: '🇩🇪',
    Japan: '🇯🇵',
    Mexico: '🇲🇽',
    Portugal: '🇵🇹',
    Spain: '🇪🇸',
    USA: '🇺🇸',
  }
  return codes[country] ?? '🏁'
}

export function WorldCupTakeover({ events }: { events: GameEvent[] }) {
  const nextMatch = nextWorldCupMatch(events)
  const fixtures = upcomingFixtures(events)
  const [team1, team2] = extractTeams(nextMatch)

  return (
    <section
      data-theme="stadium"
      data-testid="world-cup-takeover"
      className="relative shrink-0 overflow-hidden border-b border-[color:var(--acc2)]/20 bg-[color:var(--bg)]"
    >
      <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'var(--hero-bg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />

      <div className="relative mx-auto grid max-w-[1600px] gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-4 md:px-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100">
              Summer Cup Mode
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
              {formatCountdown(nextMatch)}
            </span>
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-3">
            <div className="hidden h-14 w-14 items-center justify-center rounded-lg border border-amber-300/40 bg-black/35 shadow-[0_0_40px_rgba(246,197,0,.18)] sm:flex">
              <Trophy className="h-7 w-7 text-amber-200" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="line-clamp-1 font-rajdhani text-[1.7rem] font-black tracking-tight text-white sm:text-2xl md:text-4xl">
                {flagFor(team1)} {team1} vs {team2} {flagFor(team2)}
              </h2>
              <p className="mt-0.5 line-clamp-1 text-xs text-emerald-50/75 sm:mt-1 sm:text-sm">
                {nextMatch ? `${String(nextMatch.metadata?.group ?? nextMatch.reward_summary ?? 'Summer Cup match')} · predict, cheer, and keep the calendar moving.` : 'All Summer Cup fixtures are on GamerClock.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-end">
              <Button asChild size="sm" className="bg-emerald-400 text-emerald-950 hover:bg-emerald-300">
                <Link href={nextMatch ? `/roar?match=${encodeURIComponent(nextMatch.id)}&source=home_takeover` : '/roar?source=home_takeover'}>
                  <Gamepad2 className="mr-1.5 h-4 w-4" />
                  Play ROAR
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-white/20 bg-black/25 text-white hover:bg-white/10">
                <a href="/api/feed/world-cup" target="_blank" rel="noopener noreferrer">
                  <CalendarDays className="mr-1.5 h-4 w-4" />
                  Add SC calendar
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="hidden gap-2 md:grid sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-black/30 p-3 backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
              <Flame className="h-3.5 w-3.5" /> ROAR live
            </div>
            <div className="text-sm font-bold text-white">{nextMatch ? nextMatch.title : 'Open arena'}</div>
            <p className="mt-1 text-xs text-white/60">Pick a side, create support points, and come back for the next match.</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 p-3 backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">
              <Medal className="h-3.5 w-3.5" /> Loudest nation
            </div>
            <LoudestNationMini />
          </div>
        </div>

        {fixtures.length > 0 && (
          <div className="lg:col-span-2 -mb-1 hidden gap-2 overflow-x-auto pb-1 sm:flex">
            {fixtures.map((event) => (
              <Link
                key={event.id}
                href={`/roar?match=${encodeURIComponent(event.id)}&source=home_fixture_strip`}
                className="shrink-0 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-bold text-white/85 hover:border-emerald-300/50 hover:text-white"
              >
                {event.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function LoudestNationMini() {
  const [leaders, setLeaders] = useState<Array<{ country: string; total: number }>>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/roar/cheer?scope=global&limit=3')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!cancelled && Array.isArray(payload?.totals)) {
          setLeaders(payload.totals)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-1">
      {leaders.length === 0 ? (
        <p className="text-xs text-white/60">Live cheer totals appear as fans enter ROAR.</p>
      ) : (
        leaders.map((row, index) => (
          <div key={row.country} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-white/85">{index + 1}. {row.country}</span>
            <span className="font-mono text-emerald-200">{row.total}</span>
          </div>
        ))
      )}
    </div>
  )
}
