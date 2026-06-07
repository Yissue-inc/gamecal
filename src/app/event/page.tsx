'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { getPrestigeLevel } from '@/lib/engagement-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AuthModal } from '@/components/auth/AuthModal'
import { CinematicIntro } from '@/components/cinematic/CinematicIntro'
import {
  trackLaunchEventAuthClick,
  trackLaunchEventEntryFailed,
  trackLaunchEventEntrySubmitted,
  trackLaunchEventHashtagCopied,
  trackLaunchEventShared,
  trackLaunchEventViewed,
} from '@/lib/posthog'

const EVENT_ID = 'gamecal-level-up-launch-2026'
const EVENT_NAME = 'GamerClock Level Up Launch'
const PRIZE = 'Steam $10 Gift Card x 5 winners'
const EVENT_HASHTAG = '#gamerclock'
const START_DATE = process.env.NEXT_PUBLIC_EVENT_START_DATE || '2026-06-01'
const END_DATE = process.env.NEXT_PUBLIC_EVENT_END_DATE || '2026-06-30'

const SILVER_TIERS = ['silver', 'gold', 'platinum', 'diamond']
const EVENT_INTRO_FEATURED = {
  eyebrow: 'Launch Giveaway',
  title: 'Steam $10 Gift Card',
  titleAccent: '5 Winners',
  subtitle: 'Join the GamerClock Level Up Launch event and claim your chance at the next reward.',
  accentColor: '#8b5cf6',
  eventId: EVENT_ID,
}
const EVENT_INTRO_SETTINGS = {
  brandLabel: 'GamerClock',
  sponsorLabel: 'Launch Event',
  eyebrow: 'Launch Giveaway',
  title: 'Steam $10 Gift Card',
  titleAccent: '5 Winners',
  subtitle: 'Join the GamerClock Level Up Launch event and claim your chance at the next reward.',
  primaryCta: 'Enter Giveaway',
  secondaryCta: 'View Details',
  accentColor: '#8b5cf6',
  animationStyle: 'minimal' as const,
  autoDismissMs: 120000,
  letterboxHeight: 80,
  backdropOpacity: 72,
  backdropBlur: 3,
}

function isEligible(prestigeId: string) {
  return SILVER_TIERS.includes(prestigeId)
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function daysUntil(dateStr: string) {
  const target = new Date(dateStr + 'T00:00:00').getTime()
  const now = Date.now()
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    function calculate() {
      const target = new Date(endDate + 'T23:59:59').getTime()
      const diff = target - Date.now()
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft({ days, hours, minutes, seconds })
    }
    calculate()
    const id = setInterval(calculate, 1000)
    return () => clearInterval(id)
  }, [endDate])

  return (
    <div className="flex items-center gap-3 text-center">
      {[
        { value: timeLeft.days, label: 'Days' },
        { value: timeLeft.hours, label: 'Hours' },
        { value: timeLeft.minutes, label: 'Min' },
        { value: timeLeft.seconds, label: 'Sec' },
      ].map(({ value, label }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="font-rajdhani text-3xl font-bold tabular-nums text-white">
            {String(value).padStart(2, '0')}
          </span>
          <span className="text-xs text-zinc-400">{label}</span>
        </div>
      ))}
    </div>
  )
}

function GpProgressBar({ gp }: { gp: number }) {
  const silverThreshold = 200
  const pct = Math.min(100, Math.round((gp / silverThreshold) * 100))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{gp} GP</span>
        <span>{Math.max(0, silverThreshold - gp)} GP to Silver</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function HashtagCopyButton({ hashtag }: { hashtag: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hashtag)
      trackLaunchEventHashtagCopied(hashtag)
      setCopied(true)
      toast.success(`${hashtag} copied`)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-300 transition-colors hover:border-indigo-400/50 hover:bg-indigo-500/20"
    >
      <span>{hashtag}</span>
      <span className="text-xs text-indigo-400">{copied ? '✓' : 'Copy'}</span>
    </button>
  )
}

type Platform = 'instagram' | 'tiktok' | 'twitter'

const PLATFORMS: Array<{ id: Platform; label: string; icon: string }> = [
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'twitter', label: 'X (Twitter)', icon: '🐦' },
]

interface EntryRecord {
  platform: Platform
  social_url: string
  score_at_entry: number
  entered_at: string
}

export default function EventPage() {
  const { user, isGuest, loading: authLoading } = useAuth()

  const [gp, setGp] = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)
  const [entry, setEntry] = useState<EntryRecord | null>(null)
  const [entryLoading, setEntryLoading] = useState(true)

  const [platform, setPlatform] = useState<Platform>('instagram')
  const [socialUrl, setSocialUrl] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [eventIntroOpen, setEventIntroOpen] = useState(true)

  // Load user stats
  useEffect(() => {
    if (!user) {
      setStatsLoading(false)
      return
    }
    fetch('/api/checkin')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setGp(data.gp ?? 0)
      })
      .catch(() => undefined)
      .finally(() => setStatsLoading(false))
  }, [user])

  // Pre-fill email
  useEffect(() => {
    if (user?.email) setEmail(user.email)
  }, [user])

  useEffect(() => {
    if (!authLoading && user) setAuthModalOpen(false)
  }, [authLoading, user])

  // Check existing entry
  useEffect(() => {
    if (!user) {
      setEntryLoading(false)
      return
    }
    fetch(`/api/event/entry?event_id=${encodeURIComponent(EVENT_ID)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.entry) setEntry(data.entry)
      })
      .catch(() => undefined)
      .finally(() => setEntryLoading(false))
  }, [user])

  const prestige = getPrestigeLevel(gp)
  const eligible = isEligible(prestige.id)
  const daysLeft = daysUntil(END_DATE)

  useEffect(() => {
    if (authLoading || statsLoading) return
    trackLaunchEventViewed({
      signed_in: Boolean(user && !isGuest),
      eligible: Boolean(user && !isGuest && eligible),
    })
  }, [authLoading, eligible, isGuest, statsLoading, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!socialUrl.startsWith('https://')) {
      trackLaunchEventEntryFailed('invalid_url', { platform, eligible, gp })
      toast.error('URL must start with https://')
      return
    }
    if (!email.trim()) {
      trackLaunchEventEntryFailed('missing_email', { platform, eligible, gp })
      toast.error('Enter your email address')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/event/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, social_url: socialUrl, email, event_id: EVENT_ID }),
      })
      const data = await res.json()
      if (!res.ok) {
        trackLaunchEventEntryFailed(data.error ?? 'api_error', { platform, eligible, gp })
        toast.error(data.error ?? 'Entry failed')
        return
      }
      trackLaunchEventEntrySubmitted({ platform, eligible, gp })
      setEntry(data.entry)
      toast.success('Entry submitted. Good luck!')
    } catch {
      trackLaunchEventEntryFailed('network_error', { platform, eligible, gp })
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleShare = async () => {
    const eventUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/event`
        : 'https://gamerclock.com/event'
    const text = `I entered the GamerClock Level Up Launch giveaway.\n${PRIZE}\n${EVENT_HASHTAG}\n${eventUrl}`
    if (navigator.share) {
      try {
        await navigator.share({ title: EVENT_NAME, text })
        trackLaunchEventShared('native_share')
      } catch {
        // user cancelled — ignore
      }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        trackLaunchEventShared('clipboard')
        toast.success('Link copied')
      } catch {
        toast.error('Copy failed')
      }
    }
  }

  // Not logged in
  if (!authLoading && (isGuest || !user)) {
    return (
      <div className="min-h-screen w-full bg-[#0f172a]">
        <header className="border-b border-zinc-800 px-6 py-4">
          <Link href="/" className="font-rajdhani text-xl font-bold text-white">
            Gamer<span className="text-indigo-400">Clock</span>
          </Link>
        </header>
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
          <div className="text-5xl">🎮</div>
          <h1 className="font-rajdhani mt-4 text-3xl font-bold text-white">{EVENT_NAME}</h1>
          <p className="mt-2 text-zinc-400">Sign in to join the giveaway.</p>
          <div className="mx-auto mt-5 grid max-w-md gap-2 text-left text-sm text-zinc-300">
            <div className="rounded-lg border border-violet-400/25 bg-violet-500/10 px-4 py-3">
              {PRIZE}
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3">
              Silver tier or higher can enter after login. Include {EVENT_HASHTAG} in your public post.
            </div>
          </div>
          <div className="mt-6">
            <Button
              size="lg"
              onClick={() => {
                trackLaunchEventAuthClick('event_page')
                setAuthModalOpen(true)
              }}
            >
              Sign in →
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="mt-3 text-zinc-400 hover:text-white"
            onClick={() => setEventIntroOpen(true)}
          >
            View giveaway preview
          </Button>
        </main>
        {eventIntroOpen && (
          <CinematicIntro
            featured={EVENT_INTRO_FEATURED}
            settings={EVENT_INTRO_SETTINGS}
            onDismiss={() => setEventIntroOpen(false)}
            onAddToCalendar={() => {
              trackLaunchEventAuthClick('cinematic_intro')
              setAuthModalOpen(true)
            }}
          />
        )}
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} nextPath="/event" />
      </div>
    )
  }

  if (authLoading || statsLoading || entryLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0f172a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#0f172a]">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="font-rajdhani text-xl font-bold text-white">
          Gamer<span className="text-indigo-400">Clock</span>
        </Link>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        {/* Event Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-600 p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
          <Badge className="mb-3 bg-white/20 text-white hover:bg-white/30">LIVE EVENT</Badge>
          <h1 className="font-rajdhani text-3xl font-bold text-white">{EVENT_NAME}</h1>
          <p className="mt-1 text-lg font-semibold text-white/90">🏆 {PRIZE}</p>
          <p className="mt-1 text-sm text-white/70">
            {formatDate(START_DATE)} – {formatDate(END_DATE)}
          </p>
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/60">
              Ends in
            </p>
            <CountdownTimer endDate={END_DATE} />
          </div>
        </div>

        {/* Eligibility Card */}
        <Card className="border-zinc-800 bg-[#1e293b]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">Eligibility Check</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Current tier</p>
                <p className="text-lg font-bold text-white">
                  {prestige.emoji} {prestige.label}
                </p>
                <p className="text-xs text-zinc-500">{gp} GP</p>
              </div>
              {eligible ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-2xl">
                  ✅
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-2xl">
                  🔒
                </div>
              )}
            </div>

            {eligible ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-sm font-semibold text-emerald-300">
                  You are eligible. Silver tier or higher unlocked.
                </p>
                <p className="mt-0.5 text-xs text-emerald-400/70">
                  Silver tier starts at 200 GP.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-sm font-semibold text-amber-300">
                    Silver tier or higher is required.
                  </p>
                  <p className="mt-0.5 text-xs text-amber-400/70">
                    Check in daily to earn GP and reach Silver.
                  </p>
                </div>
                <GpProgressBar gp={gp} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hashtag Section */}
        <Card className="border-zinc-800 bg-[#1e293b]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">
              📣 Post on social media with this hashtag
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-zinc-400">
              Include this hashtag in your public giveaway post.
            </p>
            <div className="flex flex-wrap gap-3">
              <HashtagCopyButton hashtag={EVENT_HASHTAG} />
            </div>
          </CardContent>
        </Card>

        {/* Entry form or already-entered state */}
        {entry ? (
          <Card className="border-emerald-500/30 bg-[#1e293b]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white">
                🎉 Entry submitted. {daysLeft} days until the drawing.
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 text-sm">
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Platform</span>
                    <span className="font-medium text-white capitalize">{entry.platform}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="shrink-0 text-zinc-500">Post URL</span>
                    <a
                      href={entry.social_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="max-w-[200px] truncate text-indigo-400 hover:underline"
                    >
                      {entry.social_url}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">GP at entry</span>
                    <span className="font-medium text-amber-400">{entry.score_at_entry} GP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Entered at</span>
                    <span className="text-zinc-300">
                      {new Date(entry.entered_at).toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-700 bg-zinc-900/30 p-4">
                <p className="text-sm font-semibold text-white">Share with friends</p>
                <p className="mt-1 text-xs text-zinc-400">
                  I entered the GamerClock Level Up Launch giveaway. Steam $10 Gift Card x 5 winners.
                </p>
                <Button onClick={handleShare} variant="outline" size="sm" className="mt-3 border-zinc-700">
                  Share 🔗
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : eligible ? (
          <Card className="border-zinc-800 bg-[#1e293b]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white">🎮 Enter Giveaway</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Platform Select */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-zinc-300">Posting platform</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PLATFORMS.map(({ id, label, icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPlatform(id)}
                        className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-3 text-sm transition-colors ${
                          platform === id
                            ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                            : 'border-zinc-700 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        <span className="text-xl">{icon}</span>
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social URL */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300" htmlFor="social-url">
                    Post URL
                  </label>
                  <Input
                    id="social-url"
                    type="url"
                    placeholder="https://www.instagram.com/p/..."
                    value={socialUrl}
                    onChange={(e) => setSocialUrl(e.target.value)}
                    required
                    className="border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600"
                  />
                  <p className="text-xs text-zinc-500">
                    Paste the link to your public post that includes {EVENT_HASHTAG}. The URL must start with https://.
                  </p>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300" htmlFor="email">
                    Email for winner contact
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-600"
                  />
                </div>

                <div className="rounded-lg border border-zinc-700 bg-zinc-900/30 p-3 text-xs text-zinc-500">
                  <p className="font-semibold text-zinc-400">Entry notes</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    <li>Your post must be public and from your own account.</li>
                    <li>Include {EVENT_HASHTAG} in the post.</li>
                    <li>Posts must be published during the event period ({formatDate(START_DATE)} - {formatDate(END_DATE)}).</li>
                    <li>One entry per account.</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500"
                  size="lg"
                >
                  {submitting ? 'Submitting...' : 'Enter Giveaway 🎮'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-zinc-800 bg-[#1e293b]">
            <CardContent className="py-6 text-center">
              <p className="text-4xl">🔒</p>
              <p className="mt-3 font-semibold text-white">Reach Silver tier to enter</p>
              <p className="mt-1 text-sm text-zinc-400">
                Check in daily to earn GP and reach Silver (200 GP).
              </p>
              <Button asChild variant="outline" className="mt-4 border-zinc-700" size="sm">
                <Link href="/profile">Go to check-in →</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
