'use client'

import Link from 'next/link'
import { ExternalLink, ShoppingBag, Trophy } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { BadgeGallery } from '@/components/engagement/BadgeGallery'
import { CalCharacter } from '@/components/engagement/CalCharacter'
import { DailyCheckIn } from '@/components/engagement/DailyCheckIn'
import { WeeklyRecapCard } from '@/components/engagement/WeeklyRecapCard'
import {
  buildWeeklyRecap,
  getAttendanceLocal,
  getGpLocal,
  getMayorTitlesLocal,
  getPartyHistoryLocal,
  getPrestigeLevel,
  getShopStateLocal,
  type PartyHistoryItem,
  type ShopState,
  type WeeklyRecap,
} from '@/lib/engagement-store'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function ProfilePage() {
  const { user, isGuest } = useAuth()
  const [stats, setStats] = useState({ streak: 0, totalDays: 0, gp: 0 })
  const [shopState, setShopState] = useState<ShopState>(getShopStateLocal())
  const [mayorTitles, setMayorTitles] = useState<string[]>([])
  const [partyHistory, setPartyHistory] = useState<PartyHistoryItem[]>([])
  const [recap, setRecap] = useState<WeeklyRecap | null>(null)
  const useApi = isSupabaseConfigured()

  useEffect(() => {
    const attendance = getAttendanceLocal()
    setStats({
      streak: attendance.currentStreak,
      totalDays: attendance.totalDays,
      gp: getGpLocal(),
    })
    setPartyHistory(getPartyHistoryLocal())
    setRecap(buildWeeklyRecap())

    if (useApi && user) {
      fetch('/api/checkin')
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          if (!payload) return
          setStats({
            streak: payload.currentStreak ?? 0,
            totalDays: payload.totalDays ?? 0,
            gp: payload.gp ?? 0,
          })
        })
        .catch(() => undefined)

      fetch('/api/shop')
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          if (payload?.state) setShopState(payload.state)
        })
        .catch(() => undefined)

      fetch('/api/leaderboard')
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => setMayorTitles(payload?.me?.mayorTitles ?? []))
        .catch(() => setMayorTitles(getMayorTitlesLocal()))
    } else {
      setShopState(getShopStateLocal())
      setMayorTitles(getMayorTitlesLocal())
    }
  }, [useApi, user])

  const prestige = getPrestigeLevel(stats.gp)

  if (isGuest || !user) {
    return (
      <div className="min-h-screen bg-[#0f0f0f]" data-testid="profile-page">
        <header className="border-b border-zinc-800 px-6 py-4">
          <Link href="/" className="font-rajdhani text-xl font-bold">
            Gamer<span className="text-primary">Clock</span>
          </Link>
          <h1 className="font-rajdhani mt-4 text-2xl font-semibold">Profile</h1>
          <p className="mt-2 text-sm text-zinc-400">
            <Link href="/" className="text-indigo-400 hover:underline">Sign in</Link> to track streaks and GP.
          </p>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-8">
          <section>
            <h2 className="font-rajdhani mb-4 text-lg font-semibold">Badges</h2>
            <BadgeGallery />
          </section>
        </main>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen ${
        shopState.activeTheme === 'neon'
          ? 'bg-[radial-gradient(circle_at_top,#2e1065,#0f0f0f_45%)]'
          : shopState.activeTheme === 'gold'
            ? 'bg-[radial-gradient(circle_at_top,#451a03,#0f0f0f_48%)]'
            : 'bg-[#0f0f0f]'
      }`}
      data-testid="profile-page"
    >
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="font-rajdhani text-xl font-bold">
          Gamer<span className="text-primary">Clock</span>
        </Link>
        <h1 className="font-rajdhani mt-4 text-2xl font-semibold">Profile</h1>
      </header>
      <main className="mx-auto max-w-3xl space-y-8 px-6 py-8">
        <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <CalCharacter mood="happy" size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-zinc-400">{user.email}</p>
            <p data-testid="prestige-level" className="mt-1 text-lg font-bold text-white">
              {prestige.emoji} {prestige.label}
            </p>
            <p data-testid="gp-count" className="text-xs text-zinc-500">{stats.gp} GP</p>
            {!!mayorTitles.length && (
              <div className="mt-2 flex flex-wrap gap-2">
                {mayorTitles.map((title) => (
                  <span key={title} className="rounded-md border border-amber-600/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                    {title}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="hidden shrink-0 gap-2 sm:flex">
            <Button asChild variant="secondary" size="sm">
              <Link href="/leaderboard">
                <Trophy className="h-4 w-4" />
                Leaderboard
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/shop">
                <ShoppingBag className="h-4 w-4" />
                GP Shop
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:hidden">
          <Button asChild variant="secondary">
            <Link href="/leaderboard">
              <Trophy className="h-4 w-4" />
              Leaderboard
            </Link>
          </Button>
          <Button asChild>
            <Link href="/shop">
              <ShoppingBag className="h-4 w-4" />
              GP Shop
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div data-testid="stat-streak" className="rounded-lg border border-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-indigo-400">{stats.streak}</div>
            <div className="text-xs text-zinc-500">Day streak</div>
          </div>
          <div data-testid="stat-total-days" className="rounded-lg border border-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.totalDays}</div>
            <div className="text-xs text-zinc-500">Total check-ins</div>
          </div>
          <div className="rounded-lg border border-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.gp}</div>
            <div className="text-xs text-zinc-500">Gamer Points</div>
          </div>
        </div>
        <section>
          <h2 className="font-rajdhani mb-4 text-lg font-semibold">Daily Check-in</h2>
          <div className="-mx-4">
            <DailyCheckIn />
          </div>
        </section>
        {recap && (
          <section>
            <h2 className="font-rajdhani mb-4 text-lg font-semibold">This Week</h2>
            <WeeklyRecapCard recap={recap} onShare={() => toast.success('Weekly recap copied')} />
          </section>
        )}
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-rajdhani text-lg font-semibold">Party History</h2>
            <span className="text-xs text-zinc-500">{partyHistory.length} created</span>
          </div>
          {partyHistory.length ? (
            <div className="space-y-2">
              {partyHistory.map((party) => (
                <a
                  key={party.url}
                  href={party.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-indigo-500/60 hover:bg-zinc-900"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">
                      {party.eventTitle}
                    </span>
                    <span className="mt-1 block truncate text-xs text-zinc-500">
                      {party.gameName} · {new Date(party.createdAt).toLocaleString()}
                      {party.fallback ? ' · local party page' : ''}
                    </span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500" />
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-500">
              Create a party from any event card and it will appear here.
            </div>
          )}
        </section>
        <section>
          <h2 className="font-rajdhani mb-4 text-lg font-semibold">Badges</h2>
          <BadgeGallery />
        </section>
      </main>
    </div>
  )
}
