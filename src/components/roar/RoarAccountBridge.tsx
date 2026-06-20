'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Lock, RadioTower, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthModal } from '@/components/auth/AuthModal'
import { useAuth } from '@/hooks/useAuth'

type MatchSummary = {
  id: string
  title: string
  startAt: string
  group?: string
  venue?: string
  score?: { ft?: [number, number] }
}

function getOrCreateDeviceId() {
  const key = 'gamerclock_roar_device_id'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const next = `roar_${crypto.randomUUID()}`
  window.localStorage.setItem(key, next)
  return next
}

function formatMatchTime(value?: string) {
  if (!value) return 'Next match'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function RoarAccountBridge() {
  const searchParams = useSearchParams()
  const { user, isGuest, loading } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [deviceId, setDeviceId] = useState('')
  const [matches, setMatches] = useState<MatchSummary[]>([])
  const [sessionLinked, setSessionLinked] = useState(false)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId())
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/world-cup/matches?limit=200')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setMatches(data?.matches ?? [])
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const selectedMatch = useMemo(() => {
    const matchId = searchParams.get('matchId')
    const now = Date.now()
    return (
      matches.find((match) => match.id === matchId) ??
      matches
        .filter((match) => new Date(match.startAt).getTime() >= now)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ??
      matches[0] ??
      null
    )
  }, [matches, searchParams])

  const teams = selectedMatch?.title.split(' vs ') ?? []
  const nextPath = `/roar${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

  async function startSession(team?: string) {
    if (!selectedMatch || !deviceId) return
    setLinking(true)
    setError('')
    const res = await fetch('/api/roar/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: selectedMatch.id,
        matchTitle: selectedMatch.title,
        teamSelected: team,
        source: searchParams.get('source') ?? 'roar_page',
        deviceId,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setLinking(false)
    if (!res.ok) {
      setError(data.error ?? 'Could not link ROAR session')
      return
    }
    setSessionLinked(true)
  }

  return (
    <section className="relative rounded-2xl border border-white/15 bg-black/35 p-5 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-200">
            <RadioTower className="h-4 w-4" />
            GamerClock ID Bridge
          </div>
          <h2 className="mt-2 font-rajdhani text-2xl font-black text-white">
            {selectedMatch?.title ?? 'World Cup match'}
          </h2>
          <p className="mt-1 text-sm text-emerald-50/65">
            {selectedMatch?.group ? `${selectedMatch.group} · ` : ''}
            {formatMatchTime(selectedMatch?.startAt)}
            {selectedMatch?.venue ? ` · ${selectedMatch.venue}` : ''}
          </p>
        </div>
        <div className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-100">
          {loading ? 'Checking ID' : user ? 'GamerClock linked' : 'Guest preview'}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(teams.length ? teams : ['Team A', 'Team B']).slice(0, 2).map((team) => (
          <Button
            key={team}
            type="button"
            onClick={() => startSession(team)}
            disabled={linking}
            className="h-11 bg-emerald-400 text-emerald-950 hover:bg-emerald-300"
          >
            <Trophy className="mr-2 h-4 w-4" />
            Back {team}
          </Button>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        {user ? (
          <div className="flex items-start gap-2 text-sm text-emerald-50/80">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            ROAR scores, match picks, ranks, and rewards will be saved to your GamerClock account.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-emerald-50/75">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
              You can preview ROAR now. Sign in to save scores, claim ranks, and keep your World Cup history.
            </div>
            <Button variant="outline" className="border-white/20 bg-black/20 text-white hover:bg-white/10" onClick={() => setAuthOpen(true)}>
              Sign in to claim ROAR progress
            </Button>
          </div>
        )}
        {sessionLinked && (
          <div className="mt-3 text-xs font-semibold text-emerald-200">
            Session linked. The playable ROAR arena can now use this match and identity.
          </div>
        )}
        {error && <div className="mt-3 text-xs font-semibold text-red-300">{error}</div>}
      </div>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} nextPath={nextPath} />
    </section>
  )
}
