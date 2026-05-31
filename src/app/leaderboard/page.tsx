'use client'

import Link from 'next/link'
import { Trophy, TimerReset, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  getLocalWeeklyGp,
  getMayorTitlesLocal,
  getWeekStartUtc,
  getWeeklyLeaderboardLocal,
  type LeaderboardRow,
} from '@/lib/engagement-store'
import { isSupabaseConfigured } from '@/lib/mock-data'

interface LeaderboardResponse {
  weekStart: string
  rows: LeaderboardRow[]
  me: { rank: number | null; totalGp: number; mayorTitles?: string[] } | null
  nextResetDays: number
}

function localNextResetDays() {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const day = now.getUTCDay()
  next.setUTCDate(next.getUTCDate() + (day === 0 ? 1 : 8 - day))
  next.setUTCHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
}

export default function LeaderboardPage() {
  const { user, isGuest } = useAuth()
  const [data, setData] = useState<LeaderboardResponse>({
    weekStart: getWeekStartUtc(),
    rows: [],
    me: null,
    nextResetDays: localNextResetDays(),
  })
  const useApi = isSupabaseConfigured()

  useEffect(() => {
    if (useApi) {
      fetch('/api/leaderboard')
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          if (payload) setData(payload)
        })
        .catch(() => {
          const rows = getWeeklyLeaderboardLocal()
          setData({
            weekStart: getWeekStartUtc(),
            rows,
            me: { rank: rows[0]?.rank ?? null, totalGp: getLocalWeeklyGp(), mayorTitles: getMayorTitlesLocal() },
            nextResetDays: localNextResetDays(),
          })
        })
    } else {
      const rows = getWeeklyLeaderboardLocal()
      setData({
        weekStart: getWeekStartUtc(),
        rows,
        me: user && !isGuest ? { rank: rows[0]?.rank ?? null, totalGp: getLocalWeeklyGp(), mayorTitles: getMayorTitlesLocal() } : null,
        nextResetDays: localNextResetDays(),
      })
    }
  }, [isGuest, useApi, user])

  const topThree = data.rows.slice(0, 3)
  const rest = data.rows.slice(3, 10)
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="leaderboard-page">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="font-rajdhani text-xl font-bold">
          Gamer<span className="text-primary">Clock</span>
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-rajdhani text-3xl font-semibold">Weekly GP Leaderboard</h1>
            <p className="mt-1 text-sm text-zinc-500">Week of {data.weekStart} · Monday to Sunday UTC</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300">
            <TimerReset className="h-4 w-4 text-indigo-300" />
            Next reset in {data.nextResetDays} day{data.nextResetDays === 1 ? '' : 's'}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <section className="grid gap-3 md:grid-cols-3">
          {topThree.map((row, index) => (
            <Card
              key={row.userId}
              className="border-zinc-800 bg-zinc-900/70 shadow-none"
            >
              <CardContent className="p-5 text-center">
                <div className="text-4xl">{medals[index]}</div>
                <div className="font-rajdhani mt-3 truncate text-2xl font-bold text-white">
                  {row.displayName}
                </div>
                <div className="mt-1 text-lg font-semibold text-amber-300">{row.totalGp} GP</div>
              </CardContent>
            </Card>
          ))}
          {!topThree.length && (
            <Card className="border-zinc-800 bg-zinc-900/60 shadow-none md:col-span-3">
              <CardContent className="p-6 text-center text-sm text-zinc-500">
                No GP logged this week yet. Check in or earn GP to claim the board.
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-2">
          {rest.map((row) => (
            <div
              key={row.userId}
              className="grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
            >
              <div className="font-mono text-sm text-zinc-500">#{row.rank}</div>
              <div className="truncate font-semibold text-white">{row.displayName}</div>
              <div className="text-sm font-bold text-amber-300">{row.totalGp} GP</div>
            </div>
          ))}
        </section>

        <Card className="border-indigo-800/60 bg-indigo-950/20 shadow-none">
          <CardHeader className="flex-row items-center justify-between space-y-0 p-5">
            <CardTitle className="font-rajdhani flex items-center gap-2 text-xl">
              <UserRound className="h-5 w-5 text-indigo-300" />
              My Rank
            </CardTitle>
            <Button asChild variant="secondary" size="sm">
              <Link href="/shop">Open GP Shop</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5">
            {data.me ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-zinc-400">
                    {data.me.rank ? `Rank #${data.me.rank}` : 'Not ranked yet'}
                  </span>
                  <span className="text-xl font-bold text-amber-300">{data.me.totalGp} GP</span>
                </div>
                {!!data.me.mayorTitles?.length && (
                  <div className="flex flex-wrap gap-2">
                    {data.me.mayorTitles.map((title) => (
                      <span key={title} className="rounded-md border border-amber-600/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                        {title}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Trophy className="h-4 w-4 text-zinc-500" />
                Sign in to see your weekly rank.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
