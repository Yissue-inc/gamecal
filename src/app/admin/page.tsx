'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { adminFetch } from '@/lib/admin-fetch'
import { toast } from 'sonner'

const CRAWLERS = [
  { slug: 'fortnite', label: 'Fortnite' },
  { slug: 'wow', label: 'World of Warcraft' },
  { slug: 'lol', label: 'League of Legends' },
  { slug: 'genshin', label: 'Genshin Impact' },
  { slug: 'pokemon-go', label: 'Pokémon GO' },
]

interface DragonPresenceDaily {
  day: string
  visit_sessions: number
  signed_in_sessions: number
  checkins: number
  last_seen_at?: string | null
}

interface ReminderPushHealth {
  config: {
    supabaseConfigured: boolean
    vapidPublicConfigured: boolean
    vapidPrivateConfigured: boolean
    vapidSubjectConfigured: boolean
    cronSecretConfigured: boolean
    adminSecretConfigured: boolean
  }
  pendingReminders: number
  dueReminders: number
  pushSubscriptions: number
  failedUnsentReminders: number
  failureBreakdown?: Record<string, number>
  recentFailures?: Array<{
    id: string
    kind: 'event' | 'release'
    userId: string
    itemId: string | null
    title: string
    game: string | null
    remindAt: string
    lastError: string
    createdAt: string
  }>
  error?: string | null
}

interface PartyHealth {
  groupCalConfigured: boolean
  groupCalUrl: string
  fallbackEnabled: boolean
}

function getDragonLevel(score: number) {
  if (score >= 180) return 4
  if (score >= 72) return 3
  if (score >= 24) return 2
  return 1
}

export default function AdminPage() {
  const [crawling, setCrawling] = useState<string | null>(null)
  const [presence, setPresence] = useState<DragonPresenceDaily | null>(null)
  const [pushHealth, setPushHealth] = useState<ReminderPushHealth | null>(null)
  const [partyHealth, setPartyHealth] = useState<PartyHealth | null>(null)
  const [processingPush, setProcessingPush] = useState(false)

  useEffect(() => {
    fetch('/api/dragon-presence')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPresence(data?.presence ?? null))
      .catch(() => undefined)
  }, [])

  const loadPushHealth = async () => {
    try {
      const res = await adminFetch('/api/admin/reminder-push')
      const data = await res.json()
      if (res.ok) {
        setPushHealth(data)
      } else {
        toast.error(data.error ?? 'Reminder push health failed')
      }
    } catch {
      toast.error('Reminder push health request failed')
    }
  }

  useEffect(() => {
    loadPushHealth()
    fetch('/api/party')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPartyHealth(data))
      .catch(() => undefined)
  }, [])

  const dragonScore = useMemo(() => {
    if (!presence) return 0
    return (
      (presence.visit_sessions ?? 0) +
      (presence.signed_in_sessions ?? 0) * 2 +
      (presence.checkins ?? 0) * 5
    )
  }, [presence])
  const dragonLevel = getDragonLevel(dragonScore)

  const triggerCrawl = async (slug: string) => {
    setCrawling(slug)
    try {
      const res = await adminFetch(`/api/admin/crawl/${slug}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${slug} crawl complete`, { description: JSON.stringify(data).slice(0, 80) })
      } else {
        toast.error(data.error ?? 'Crawl failed')
      }
    } catch {
      toast.error('Crawl request failed')
    } finally {
      setCrawling(null)
    }
  }

  const processReminderPush = async () => {
    setProcessingPush(true)
    try {
      const res = await adminFetch('/api/admin/reminder-push', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Reminder push processed', {
          description: `Processed ${data.processed ?? 0}, sent ${data.sent ?? 0}, failed ${data.failed ?? 0}`,
        })
        await loadPushHealth()
      } else {
        toast.error(data.error ?? 'Reminder push failed')
      }
    } catch {
      toast.error('Reminder push request failed')
    } finally {
      setProcessingPush(false)
    }
  }

  return (
    <main data-testid="admin-landing" className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">GamerClock Admin</h1>
        <p className="text-muted-foreground">
          Manage events, releases, and trigger crawlers.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card data-testid="dragon-presence-admin-card" className="overflow-hidden border-amber-500/25 bg-zinc-900 sm:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Dragon Presence</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Today&apos;s collective visit and check-in energy.
                </p>
              </div>
              <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm font-bold text-amber-300">
                Level {dragonLevel}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Score</div>
                <div data-testid="dragon-presence-score" className="mt-1 text-2xl font-black text-white">
                  {dragonScore}
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Visits</div>
                <div className="mt-1 text-2xl font-black text-white">{presence?.visit_sessions ?? 0}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Signed In</div>
                <div className="mt-1 text-2xl font-black text-white">{presence?.signed_in_sessions ?? 0}</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Check-ins</div>
                <div className="mt-1 text-2xl font-black text-white">{presence?.checkins ?? 0}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-zinc-500">
              <span>{presence?.day ? `Day ${presence.day}` : 'Waiting for presence data'}</span>
              <span>
                {presence?.last_seen_at
                  ? `Updated ${new Date(presence.last_seen_at).toLocaleTimeString()}`
                  : 'No activity yet'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900">
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              View all events, filter by date, toggle publish status.
            </p>
            <Button data-testid="open-events-admin" asChild>
              <Link href="/admin/events">Manage Events →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900">
          <CardHeader>
            <CardTitle>New Releases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Edit hero colors, featured status, and publish state.
            </p>
            <Button data-testid="open-releases-admin" asChild>
              <Link href="/admin/releases">Manage Releases →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900">
          <CardHeader>
            <CardTitle>Release Candidate Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Crawl upcoming games, review candidates, and approve only real releases.
            </p>
            <Button data-testid="open-release-candidates-admin" asChild>
              <Link href="/admin/release-candidates">Review Queue →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="reminder-push-admin-card" className="bg-zinc-900 sm:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Reminder Push QA</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Check reminder delivery readiness and manually process due reminders.
                </p>
              </div>
              <Button
                data-testid="process-reminder-push"
                variant="outline"
                size="sm"
                disabled={processingPush}
                onClick={processReminderPush}
              >
                {processingPush ? 'Processing…' : 'Process Due'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Pending</div>
                <div data-testid="reminder-pending-count" className="mt-1 text-2xl font-black text-white">
                  {pushHealth?.pendingReminders ?? 0}
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Due Now</div>
                <div data-testid="reminder-due-count" className="mt-1 text-2xl font-black text-white">
                  {pushHealth?.dueReminders ?? 0}
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Subscriptions</div>
                <div data-testid="push-subscription-count" className="mt-1 text-2xl font-black text-white">
                  {pushHealth?.pushSubscriptions ?? 0}
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Failed Open</div>
                <div data-testid="reminder-failed-count" className="mt-1 text-2xl font-black text-white">
                  {pushHealth?.failedUnsentReminders ?? 0}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {([
                ['Supabase', pushHealth?.config.supabaseConfigured],
                ['VAPID public', pushHealth?.config.vapidPublicConfigured],
                ['VAPID private', pushHealth?.config.vapidPrivateConfigured],
                ['VAPID subject', pushHealth?.config.vapidSubjectConfigured],
                ['CRON secret', pushHealth?.config.cronSecretConfigured],
                ['Admin secret', pushHealth?.config.adminSecretConfigured],
              ] as Array<[string, boolean | undefined]>).map(([label, ok]) => (
                <span
                  key={label}
                  className={`rounded-full border px-2 py-1 ${
                    ok
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  }`}
                >
                  {ok ? '✓' : '!'} {label}
                </span>
              ))}
            </div>
            {pushHealth?.error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {pushHealth.error}
              </p>
            )}
            <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
              <div className="rounded-lg border border-zinc-800 bg-black/20 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Failure reasons
                </div>
                <div className="mt-3 space-y-2">
                  {Object.entries(pushHealth?.failureBreakdown ?? {}).length ? (
                    Object.entries(pushHealth?.failureBreakdown ?? {}).map(([reason, count]) => (
                      <div key={reason} className="flex items-center justify-between gap-3 text-xs">
                        <span className="min-w-0 truncate text-zinc-300" title={reason}>
                          {reason}
                        </span>
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-semibold text-white">
                          {count}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-500">No open failure samples.</p>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/20 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Recent failures
                </div>
                <div className="mt-3 divide-y divide-zinc-800">
                  {pushHealth?.recentFailures?.length ? (
                    pushHealth.recentFailures.map((failure) => (
                      <div key={`${failure.kind}-${failure.id}`} className="grid gap-1 py-2 text-xs sm:grid-cols-[1fr_auto]">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-zinc-200">
                            {failure.kind === 'release' ? 'NEW / ' : ''}
                            {failure.title}
                          </div>
                          <div className="mt-0.5 truncate text-zinc-500">
                            {failure.game ? `${failure.game} · ` : ''}
                            {failure.lastError}
                          </div>
                        </div>
                        <div className="text-zinc-500">
                          {new Date(failure.remindAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-2 text-xs text-zinc-500">No failed reminders to inspect.</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="party-finder-admin-card" className="bg-zinc-900 sm:col-span-2">
          <CardHeader>
            <CardTitle>Party Finder QA</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              GroupCal integration status for Create Party links.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-500">GroupCal Sync</div>
                <div className={`mt-1 text-lg font-black ${partyHealth?.groupCalConfigured ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {partyHealth?.groupCalConfigured ? 'Live' : 'Fallback'}
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Fallback Page</div>
                <div className={`mt-1 text-lg font-black ${partyHealth?.fallbackEnabled ? 'text-emerald-300' : 'text-red-300'}`}>
                  {partyHealth?.fallbackEnabled ? 'Ready' : 'Off'}
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-3">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Target</div>
                <div className="mt-1 truncate text-sm font-semibold text-white" title={partyHealth?.groupCalUrl}>
                  {partyHealth?.groupCalUrl ?? 'Checking...'}
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              If GroupCal sync is Fallback, users still get a shareable GamerClock party page. Add
              GROUPCAL_EXTERNAL_API_KEY to enable live GroupCal voting links.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900">
        <CardHeader>
          <CardTitle>Crawler Triggers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Manually run game crawlers to refresh event data.
          </p>
          <div className="flex flex-wrap gap-2">
            {CRAWLERS.map(({ slug, label }) => (
              <Button
                key={slug}
                variant="outline"
                size="sm"
                data-testid={`crawl-${slug}`}
                disabled={crawling === slug}
                onClick={() => triggerCrawl(slug)}
              >
                {crawling === slug ? 'Running…' : label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900">
        <CardHeader>
          <CardTitle>Legacy Console</CardTitle>
        </CardHeader>
        <CardContent>
          <Button data-testid="open-admin-console" variant="outline" asChild>
            <Link href="/admin/console.html" target="_blank">
              Open Standalone Console →
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
