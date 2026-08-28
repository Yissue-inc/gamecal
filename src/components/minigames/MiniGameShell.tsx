'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Gamepad2, RotateCw } from 'lucide-react'
import { AuthModal } from '@/components/auth/AuthModal'
import { MiniGameFrame } from '@/components/minigames/MiniGameFrame'
import { MiniGameResultPanel, type MiniGameResult, type MiniGameSaveState } from '@/components/minigames/MiniGameResultPanel'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import type { MiniGameManifest } from '@/lib/minigames'
import { trackEvent } from '@/lib/posthog'

type MiniGameShellProps = {
  game: MiniGameManifest
  eventId?: string
  source?: string
}

type BridgeMessage = {
  type: string
  payload?: Record<string, unknown>
}

function getDeviceId() {
  const key = 'gamerclock-minigame-device-id'
  const stored = window.localStorage.getItem(key)
  if (stored) return stored
  const deviceId = window.crypto?.randomUUID?.() ?? `device_${Date.now()}_${Math.random().toString(16).slice(2)}`
  window.localStorage.setItem(key, deviceId)
  return deviceId
}

export function MiniGameShell({ game, eventId, source }: MiniGameShellProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const { user, isGuest, loading } = useAuth()
  const [frameKey, setFrameKey] = useState(0)
  const [bridgeReady, setBridgeReady] = useState(false)
  const [started, setStarted] = useState(false)
  const [result, setResult] = useState<MiniGameResult | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [saveState, setSaveState] = useState<MiniGameSaveState>({ status: 'idle' })
  const [needsLandscape, setNeedsLandscape] = useState(false)
  // The iframe URL must stay SSR-stable so hydration never reloads the game
  // mid-launch. The real session id is kept in a ref and used only by the APIs.
  const sessionId = 'guest'
  const serverSessionRef = useRef<string | null>(null)
  const pendingSaveRef = useRef<MiniGameResult | null>(null)
  const deviceIdRef = useRef<string | null>(null)

  const track = useCallback((name: string, properties: Record<string, unknown> = {}) => {
    trackEvent(`${game.analyticsPrefix}_${name}`, {
      game_slug: game.slug,
      session_id: sessionId,
      event_id: eventId ?? null,
      source: source ?? 'direct',
      ...properties,
    })
  }, [eventId, game.analyticsPrefix, game.slug, sessionId, source])

  const sendContext = useCallback(() => {
    const target = frameRef.current?.contentWindow
    if (!target || !bridgeReady) return
    target.postMessage({
      type: 'GAMECLOCK_CONTEXT',
      payload: {
        userId: user?.id ?? null,
        deviceId: deviceIdRef.current ?? getDeviceId(),
        sessionId,
        eventId: eventId ?? null,
        source: source ?? 'direct',
        locale: navigator.language,
        theme: 'dark',
      },
    }, window.location.origin)
  }, [bridgeReady, eventId, sessionId, source, user?.id])

  useEffect(() => {
    deviceIdRef.current = getDeviceId()
    track('opened')
    let cancelled = false
    // A session is created for guests too. A failure here must never block play.
    void fetch('/api/minigames/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        miniGameSlug: game.slug,
        eventId: eventId ?? null,
        deviceId: deviceIdRef.current,
        source: source ?? 'direct',
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.session?.id) return
        serverSessionRef.current = data.session.id
        track('session_started', { persisted: !!data.persisted, identity: data.identity ?? 'device' })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [eventId, game.slug, source, track])

  useEffect(() => {
    if (game.orientation !== 'landscape') {
      setNeedsLandscape(false)
      return
    }
    const query = window.matchMedia('(orientation: portrait)')
    const sync = () => setNeedsLandscape(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [game.orientation])

  const saveScore = useCallback(async (pending: MiniGameResult) => {
    setSaveState({ status: 'saving' })
    track('save_requested', { score: pending.score ?? null })
    try {
      const res = await fetch('/api/minigames/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: serverSessionRef.current,
          miniGameSlug: game.slug,
          eventId: eventId ?? null,
          score: pending.score ?? 0,
          rankLabel: pending.rankLabel ?? null,
          durationMs: pending.durationMs ?? 0,
          stats: pending.stats ?? {},
        }),
      })
      const data = await res.json().catch(() => null)

      if (res.status === 401 && data?.authRequired) {
        pendingSaveRef.current = pending
        setSaveState({ status: 'idle' })
        track('auth_gate_hit')
        setAuthOpen(true)
        return
      }
      if (res.status === 503) {
        setSaveState({ status: 'unavailable' })
        return
      }
      if (!res.ok || !data?.score) {
        setSaveState({ status: 'error', message: 'Could not save that run. Try again.' })
        return
      }
      pendingSaveRef.current = null
      setSaveState({
        status: 'saved',
        isPersonalBest: !!data.score.isPersonalBest,
        best: Number(data.score.score ?? pending.score ?? 0),
      })
      track('score_saved', { score: data.score.score ?? null, personal_best: !!data.score.isPersonalBest })
    } catch {
      setSaveState({ status: 'error', message: 'Could not reach the server. Try again.' })
    }
  }, [eventId, game.slug, track])

  // Signing in from the result panel finishes the save the guest already asked for.
  useEffect(() => {
    if (loading || isGuest || !user) return
    const pending = pendingSaveRef.current
    if (!pending) return
    pendingSaveRef.current = null
    void saveScore(pending)
  }, [isGuest, loading, saveScore, user])

  useEffect(() => {
    sendContext()
  }, [sendContext])

  useEffect(() => {
    function onMessage(event: MessageEvent<BridgeMessage>) {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return
      const { type, payload = {} } = event.data ?? {}
      if (!type?.startsWith?.('MINIGAME_')) return

      if (type === 'MINIGAME_READY') {
        setBridgeReady(true)
        track('ready')
        return
      }
      if (type === 'MINIGAME_STARTED') {
        if (!started) {
          setStarted(true)
          track('started')
        }
        return
      }
      if (type === 'MINIGAME_SCORE_CHANGED') {
        track('score_changed', { score: Number(payload.score ?? 0) })
        return
      }
      if (type === 'MINIGAME_COMPLETED') {
        const nextResult: MiniGameResult = {
          score: typeof payload.score === 'number' ? payload.score : undefined,
          durationMs: typeof payload.durationMs === 'number' ? payload.durationMs : undefined,
          result: payload.result === 'win' || payload.result === 'lose' ? payload.result : 'complete',
          rankLabel: typeof payload.rankLabel === 'string' ? payload.rankLabel : null,
          stats: payload.stats && typeof payload.stats === 'object' && !Array.isArray(payload.stats)
            ? payload.stats as Record<string, unknown>
            : undefined,
        }
        setResult(nextResult)
        setSaveState({ status: 'idle' })
        pendingSaveRef.current = nextResult
        track('completed', {
          score: nextResult.score ?? null,
          duration_ms: nextResult.durationMs ?? null,
          result: nextResult.result,
          stats: nextResult.stats ?? {},
        })
        return
      }
      if (type === 'MINIGAME_ERROR') track('error', { message: String(payload.message ?? 'Unknown game error') })
      if (type === 'MINIGAME_CTA_CLICKED') track('cta_clicked', payload)
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [started, track])

  const handleFrameLoad = useCallback(() => {
    // An iframe load is the minimum safe readiness signal. The bridge message is
    // still used for analytics/context, but it can arrive before React attaches
    // its listener on a slow mobile launch. Never leave a fully loaded game
    // hidden behind the parent shell's loading veil in that race.
    setBridgeReady(true)
    setStarted(false)
  }, [])

  const handlePlayAgain = useCallback(() => {
    setResult(null)
    setSaveState({ status: 'idle' })
    pendingSaveRef.current = null
    setStarted(false)
    setBridgeReady(false)
    setFrameKey((key) => key + 1)
    track('play_again')
  }, [track])

  const handleSignIn = useCallback(() => {
    track('auth_gate_hit')
    setAuthOpen(true)
  }, [track])

  const handleSaveScore = useCallback(() => {
    const pending = pendingSaveRef.current ?? result
    if (!pending) return
    void saveScore(pending)
  }, [result, saveScore])

  const frameQuery = new URLSearchParams({
    ...(game.launchParams ?? {}),
    embed: 'gamerclock',
    session: sessionId,
    v: game.version,
  })
  const frameSrc = `${game.entry}?${frameQuery.toString()}`
  const returnPath = `/play/${game.slug}${eventId ? `?eventId=${encodeURIComponent(eventId)}` : ''}`

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b1220]/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="shrink-0 text-zinc-300 hover:text-white">
              <Link href="/" aria-label="Back to GamerClock calendar"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <Link href="/" className="hidden font-rajdhani text-xl font-bold sm:block">Gamer<span className="text-primary">Clock</span></Link>
            <span className="hidden h-5 w-px bg-zinc-700 sm:block" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{game.title}</p>
              <p className="hidden text-xs text-zinc-400 sm:block">Guest play is ready now · Sign in later to save future results</p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs font-medium text-cyan-100">
            <Gamepad2 className="h-3.5 w-3.5" aria-hidden="true" /> Play
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-0 px-0 sm:px-4 sm:py-4">
        <section className="relative overflow-hidden bg-[#06182a] shadow-2xl sm:rounded-2xl sm:border sm:border-white/10" aria-label={`${game.title} game`}>
          <div className={game.orientation === 'landscape'
            ? 'aspect-video w-full'
            : 'h-[calc(100dvh-58px)] min-h-[600px] max-h-[1040px] sm:h-[calc(100dvh-114px)]'}>
            <MiniGameFrame key={frameKey} ref={frameRef} src={frameSrc} title={game.title} onLoad={handleFrameLoad} />
          </div>
          {!bridgeReady ? <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#06182a] text-sm text-cyan-100">Preparing your journey…</div> : null}
          {needsLandscape ? (
            <div className="absolute inset-0 grid place-items-center bg-[#06182a]/95 p-6 text-center">
              <div>
                <RotateCw className="mx-auto size-8 text-cyan-200" aria-hidden="true" />
                <p className="mt-3 text-base font-bold text-white">Rotate to landscape to play</p>
                <p className="mt-1 text-sm text-slate-300">{game.title} is built for a wide screen.</p>
              </div>
            </div>
          ) : null}
        </section>
        {result ? (
          <MiniGameResultPanel
            result={result}
            gameTitle={game.title}
            scoreUnit={game.score.unit}
            isGuest={!loading && isGuest}
            saveState={saveState}
            onPlayAgain={handlePlayAgain}
            onSignIn={handleSignIn}
            onSaveScore={handleSaveScore}
            onBackToCalendar={() => track('calendar_return_clicked')}
          />
        ) : null}
      </main>

      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        nextPath={returnPath}
        source="mini_game_result"
        sourceMeta={{ game_slug: game.slug, session_id: sessionId }}
        title={`Save your ${game.title} journey`}
        description="Create a GamerClock account to save future mini-game progress and rewards."
        bullets={['Keep future mini-game progress in one place.', 'Save calendar reminders for the games you follow.', 'Return to your GamerClock calendar anytime.']}
      />
    </div>
  )
}
