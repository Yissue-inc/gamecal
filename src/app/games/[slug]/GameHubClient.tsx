'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { Game, GameEvent } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatShortDate, getDday, isCurrentlyActive, isWithinDays } from '@/lib/calendar-dates'
import { getEventTypeIcon, getEventTypeLabel, withGamerClockUtm } from '@/lib/utils'
import { getRewardBadgeLabel, getRewardSignals } from '@/lib/reward-signals'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'tournaments', label: 'Tournaments' },
  { id: 'resets', label: 'Resets' },
  { id: 'patches', label: 'Patches' },
] as const

type FilterId = (typeof FILTERS)[number]['id']

function copyText(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  return Promise.resolve()
}

function matchesFilter(event: GameEvent, filter: FilterId) {
  if (filter === 'all') return true
  if (filter === 'tournaments') return event.event_type === 'tournament'
  if (filter === 'resets') return event.event_type.includes('reset') || event.event_type === 'weekly_reset'
  if (filter === 'patches') return event.event_type === 'patch_release' || event.event_type === 'new_content'
  if (filter === 'rewards') {
    const reward = getRewardSignals(event, event.game)
    return reward.reward_score >= 45 && reward.reward_type !== 'none'
  }
  return true
}

function EventRow({ event }: { event: GameEvent }) {
  const reward = getRewardSignals(event, event.game)
  const rewardLabel = getRewardBadgeLabel(event)

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{getEventTypeIcon(event.event_type)} {getEventTypeLabel(event.event_type)}</Badge>
            <Badge variant="outline">{getDday(event.start_at)}</Badge>
            {rewardLabel && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-300">
                🎁 {reward.reward_score}
              </Badge>
            )}
          </div>
          <h3 className="truncate text-base font-bold text-white">{event.title}</h3>
          <p className="mt-1 text-xs text-zinc-500">{formatShortDate(event.start_at)}</p>
          {event.description && <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{event.description}</p>}
        </div>
        {event.source_url && (
          <Button size="sm" variant="outline" asChild>
            <a href={withGamerClockUtm(event.source_url, 'game_hub_source')} target="_blank" rel="noopener noreferrer">
              Source
            </a>
          </Button>
        )}
      </div>
    </article>
  )
}

export function GameHubClient({ game, events }: { game: Game; events: GameEvent[] }) {
  const [filter, setFilter] = useState<FilterId>('all')
  const filtered = useMemo(() => events.filter((event) => matchesFilter(event, filter)), [events, filter])
  const live = filtered.filter(isCurrentlyActive)
  const thisWeek = filtered.filter((event) => !isCurrentlyActive(event) && isWithinDays(event.start_at, 7))
  const upcoming = filtered.filter((event) => !isCurrentlyActive(event) && !isWithinDays(event.start_at, 7))

  async function handleShare() {
    const url = `${window.location.origin}/games/${game.slug}?utm_source=gamerclock&utm_medium=share&utm_campaign=game_hub`
    await copyText(`${game.name} gaming calendar on GamerClock\n${url}`)
    toast.success('Game hub link copied')
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="game-hub-page">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="font-rajdhani text-xl font-bold">
          Gamer<span className="text-primary">Clock</span>
        </Link>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <section
          className="overflow-hidden rounded-2xl border border-zinc-800 p-6 md:p-8"
          style={{ background: `linear-gradient(135deg, ${game.brand_color}55 0%, #111 55%, #0f0f0f 100%)` }}
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <Link href="/" className="text-xs font-semibold text-zinc-400 hover:text-white">
                ← All Games
              </Link>
              <h1 className="font-rajdhani mt-4 text-4xl font-black text-white md:text-6xl">{game.name}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                {game.platform.map((platform) => (
                  <Badge key={platform} variant="secondary">{platform}</Badge>
                ))}
              </div>
              <p className="mt-4 max-w-xl text-sm text-zinc-300">
                Track resets, patches, tournaments, live events, and reward windows for {game.name}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={`/api/feed/${game.slug}`} target="_blank" rel="noopener noreferrer">
                  Subscribe
                </a>
              </Button>
              <Button variant="outline" onClick={handleShare}>Share</Button>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                filter === item.id
                  ? 'border-indigo-500 bg-indigo-500 text-white'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section className="space-y-4">
          <h2 className="font-rajdhani text-xl font-bold text-red-300">Live Now</h2>
          {live.length ? live.map((event) => <EventRow key={event.id} event={event} />) : (
            <p className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-500">No live events right now.</p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-rajdhani text-xl font-bold">This Week</h2>
          {thisWeek.length ? thisWeek.map((event) => <EventRow key={event.id} event={event} />) : (
            <p className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-500">No high-signal events this week.</p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-rajdhani text-xl font-bold">Upcoming</h2>
          {upcoming.length ? upcoming.map((event) => <EventRow key={event.id} event={event} />) : (
            <p className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-500">No upcoming events found.</p>
          )}
        </section>
      </main>
    </div>
  )
}
