'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, BarChart3, CalendarDays, Gamepad2, RefreshCw, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { adminFetch } from '@/lib/admin-fetch'

type MetricsPayload = {
  generatedAt: string
  users: {
    total: number
    new24h: number
    new7d: number
    latest: Array<{ id: string; email?: string; createdAt?: string; provider?: string }>
  }
  site: {
    newsletterSubscribers: { total: number; last24h: number; last7d: number }
    pushSubscriptions: number
    gameWishlists: { total: number; last24h: number }
    gameReminders: { total: number; last24h: number }
    releaseWishlists: { total: number; last24h: number }
    releaseReminders: { total: number; last24h: number }
    gpAwarded: { last24h: number; last7d: number }
  }
  roar: {
    sessions: { total: number; last24h: number; last7d: number }
    participants: { knownUsers: number; guestDevices: number; totalApprox: number }
    cheers: {
      eventsLast24h: number
      eventsLast7d: number
      tapsLast24h: number
      scoreLast24h: number
      scoreLast7d: number
    }
    savedScores: { total: number; last24h: number }
    miniCupPlayers: { total: number; last24h: number }
    predictions: {
      total: number
      open: number
      won: number
      lost: number
      claimed: number
      stakeTotal: number
      payoutTotal: number
    }
    globalCheer: { total: number; taps: number; shakes: number }
    topNations: Array<{ country: string; total: number; taps: number; shakes: number }>
    topMatches: Array<{ matchId: string; matchTitle: string; sessions: number; cheers: number; score: number }>
    sources: Array<{ source: string; count: number }>
    recentSessions: Array<{ matchId: string; matchTitle: string; teamSelected?: string | null; source: string; lastSeenAt?: string | null }>
  }
  external: {
    ga4: string
    vercel: string
    posthog: string
  }
  ga4: {
    configured: boolean
    propertyId?: string | null
    eventsLast7d: Array<{ eventName: string; count: number }>
    keyEventsLast7d: Array<{ eventName: string; count: number }>
    topPagesLast7d: Array<{ path: string; views: number }>
    error?: string | null
  }
  errors?: string[]
}

function fmt(value?: number | null) {
  return Intl.NumberFormat('en-US').format(Number(value) || 0)
}

function timeAgo(value?: string | null) {
  if (!value) return 'n/a'
  const diff = Date.now() - new Date(value).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</div>
            <div className="mt-2 text-2xl font-black text-white">{value}</div>
          </div>
          <div className="rounded-lg border border-violet-400/20 bg-violet-400/10 p-2 text-violet-200">
            {icon}
          </div>
        </div>
        {sub && <p className="mt-2 text-xs leading-5 text-zinc-500">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function MiniRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black/25 px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-zinc-100">{label}</div>
        {sub && <div className="mt-0.5 truncate text-xs text-zinc-500">{sub}</div>}
      </div>
      <div className="shrink-0 font-mono text-sm font-black text-emerald-300">{value}</div>
    </div>
  )
}

export default function AdminMetricsPage() {
  const [data, setData] = useState<MetricsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMetrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminFetch('/api/admin/metrics')
      const payload = await res.json()
      if (!res.ok) {
        setError(payload.error ?? 'Metrics request failed')
        setData(null)
      } else {
        setData(payload)
      }
    } catch {
      setError('Metrics request failed')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [])

  const conversion = useMemo(() => {
    if (!data?.roar.sessions.total) return 0
    return Math.round((data.roar.savedScores.total / data.roar.sessions.total) * 1000) / 10
  }, [data])

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Live Metrics</p>
          <h1 className="mt-2 text-3xl font-bold text-white">GamerClock + ROAR Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Supabase-backed counts for signups, newsletter, calendar engagement, ROAR participation, predictions, and saved scores.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-zinc-700" onClick={loadMetrics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild variant="outline" className="border-zinc-700">
            <Link href="/admin/analytics">Analytics Links</Link>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-500/30 bg-red-950/30">
          <CardContent className="p-4 text-sm text-red-200">{error}</CardContent>
        </Card>
      )}

      {loading && !data ? (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-8 text-sm text-zinc-400">Loading metrics...</CardContent>
        </Card>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Signups"
              value={fmt(data.users.total)}
              sub={`+${fmt(data.users.new24h)} last 24h · +${fmt(data.users.new7d)} last 7d`}
              icon={<UserPlus className="h-5 w-5" />}
            />
            <StatCard
              label="ROAR participants"
              value={fmt(data.roar.participants.totalApprox)}
              sub={`${fmt(data.roar.participants.knownUsers)} signed users · ${fmt(data.roar.participants.guestDevices)} guest devices`}
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              label="ROAR sessions"
              value={fmt(data.roar.sessions.total)}
              sub={`+${fmt(data.roar.sessions.last24h)} last 24h · +${fmt(data.roar.sessions.last7d)} last 7d`}
              icon={<Gamepad2 className="h-5 w-5" />}
            />
            <StatCard
              label="Save conversion"
              value={`${conversion}%`}
              sub={`${fmt(data.roar.savedScores.total)} saved scores from ${fmt(data.roar.sessions.total)} sessions`}
              icon={<BarChart3 className="h-5 w-5" />}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Newsletter"
              value={fmt(data.site.newsletterSubscribers.total)}
              sub={`+${fmt(data.site.newsletterSubscribers.last24h)} last 24h · +${fmt(data.site.newsletterSubscribers.last7d)} last 7d`}
              icon={<Activity className="h-5 w-5" />}
            />
            <StatCard
              label="Calendar saves"
              value={fmt(data.site.gameWishlists.total + data.site.gameReminders.total)}
              sub={`${fmt(data.site.gameWishlists.last24h + data.site.gameReminders.last24h)} new last 24h`}
              icon={<CalendarDays className="h-5 w-5" />}
            />
            <StatCard
              label="ROAR cheer power"
              value={fmt(data.roar.globalCheer.total)}
              sub={`${fmt(data.roar.cheers.scoreLast24h)} score last 24h · ${fmt(data.roar.cheers.eventsLast24h)} cheer events`}
              icon={<Activity className="h-5 w-5" />}
            />
            <StatCard
              label="Predictions"
              value={fmt(data.roar.predictions.total)}
              sub={`${fmt(data.roar.predictions.open)} open · ${fmt(data.roar.predictions.claimed)} claimed`}
              icon={<BarChart3 className="h-5 w-5" />}
            />
          </div>

          <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-lg">Top Nations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.roar.topNations.length ? data.roar.topNations.map((row, index) => (
                  <MiniRow
                    key={row.country}
                    label={`${index + 1}. ${row.country}`}
                    value={fmt(row.total)}
                    sub={`${fmt(row.taps)} taps · ${fmt(row.shakes)} shakes`}
                  />
                )) : <p className="text-sm text-zinc-500">No ROAR cheer totals yet.</p>}
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-lg">Top Matches</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.roar.topMatches.length ? data.roar.topMatches.map((row) => (
                  <MiniRow
                    key={row.matchId}
                    label={row.matchTitle}
                    value={fmt(row.score)}
                    sub={`${fmt(row.sessions)} sessions · ${fmt(row.cheers)} cheers`}
                  />
                )) : <p className="text-sm text-zinc-500">No ROAR match activity yet.</p>}
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-lg">Traffic Sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.roar.sources.length ? data.roar.sources.map((row) => (
                  <MiniRow key={row.source} label={row.source} value={fmt(row.count)} />
                )) : <p className="text-sm text-zinc-500">No source data yet.</p>}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-lg">Site Engagement</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                <MiniRow label="Push subscriptions" value={fmt(data.site.pushSubscriptions)} />
                <MiniRow label="Release wishlists" value={fmt(data.site.releaseWishlists.total)} sub={`+${fmt(data.site.releaseWishlists.last24h)} last 24h`} />
                <MiniRow label="Release reminders" value={fmt(data.site.releaseReminders.total)} sub={`+${fmt(data.site.releaseReminders.last24h)} last 24h`} />
                <MiniRow label="GP awarded" value={fmt(data.site.gpAwarded.last7d)} sub={`${fmt(data.site.gpAwarded.last24h)} last 24h`} />
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-lg">Recent ROAR Sessions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.roar.recentSessions.length ? data.roar.recentSessions.map((row, index) => (
                  <MiniRow
                    key={`${row.matchId}-${index}`}
                    label={row.matchTitle || row.matchId}
                    value={timeAgo(row.lastSeenAt)}
                    sub={`${row.teamSelected ?? 'No team'} · ${row.source}`}
                  />
                )) : <p className="text-sm text-zinc-500">No recent ROAR sessions.</p>}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="border-zinc-800 bg-zinc-900 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">GA4 Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-zinc-800 bg-black/25 p-3">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Status</div>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    {data.ga4.configured
                      ? `Property ${data.ga4.propertyId ?? 'configured'} · Last 7 days`
                      : 'GA4 Data API is not configured for this dashboard yet.'}
                  </p>
                  {data.ga4.error && (
                    <p className="mt-2 text-xs leading-5 text-amber-200">{data.ga4.error}</p>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.ga4.keyEventsLast7d.length ? data.ga4.keyEventsLast7d.map((row) => (
                    <MiniRow key={row.eventName} label={row.eventName} value={fmt(row.count)} />
                  )) : (
                    <p className="text-sm text-zinc-500">
                      Add GA4_PROPERTY_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY to show event values here.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-lg">GA4 Top Pages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.ga4.topPagesLast7d.length ? data.ga4.topPagesLast7d.map((row) => (
                  <MiniRow key={row.path} label={row.path} value={fmt(row.views)} />
                )) : <p className="text-sm text-zinc-500">No GA4 page data loaded.</p>}
              </CardContent>
            </Card>
          </section>

          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-lg">External Analytics Status</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-black/25 p-4">
                <div className="font-bold text-white">GA4</div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{data.external.ga4}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/25 p-4">
                <div className="font-bold text-white">Vercel Analytics</div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{data.external.vercel}</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/25 p-4">
                <div className="font-bold text-white">PostHog</div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{data.external.posthog}</p>
              </div>
            </CardContent>
          </Card>

          {data.errors?.length ? (
            <Card className="border-amber-500/25 bg-amber-950/20">
              <CardHeader>
                <CardTitle className="text-lg">Data Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.errors.map((item) => (
                  <div key={item} className="rounded border border-amber-500/20 bg-black/20 p-2 text-xs text-amber-100">
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <p className="text-xs text-zinc-600">
            Generated {new Date(data.generatedAt).toLocaleString()}. DB-backed metrics update immediately; GA4 values update after Google processes incoming events.
          </p>
        </>
      ) : null}
    </main>
  )
}
