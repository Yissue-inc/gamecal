'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Gamepad2 } from 'lucide-react'
import { AuthModal } from '@/components/auth/AuthModal'
import { MiniGameFrame } from '@/components/minigames/MiniGameFrame'
import { MiniGameResultPanel, type MiniGameResult } from '@/components/minigames/MiniGameResultPanel'
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
  // Persistence is intentionally out of this first guest-play release. Keep
  // the iframe URL SSR-stable so hydration never reloads the game mid-launch.
  const sessionId = 'guest'
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
  }, [track])

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
          stats: payload.stats && typeof payload.stats === 'object' && !Array.isArray(payload.stats)
            ? payload.stats as Record<string, unknown>
            : undefined,
        }
        setResult(nextResult)
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
    setBridgeReady(false)
  }, [])

  const handlePlayAgain = useCallback(() => {
    setResult(null)
    setStarted(false)
    setBridgeReady(false)
    setFrameKey((key) => key + 1)
    track('play_again')
  }, [track])

  const handleSignIn = useCallback(() => {
    track('auth_gate_opened')
    setAuthOpen(true)
  }, [track])

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
          <div className="h-[calc(100dvh-58px)] min-h-[600px] max-h-[1040px] sm:h-[calc(100dvh-114px)]">
            <MiniGameFrame key={frameKey} ref={frameRef} src={frameSrc} title={game.title} onLoad={handleFrameLoad} />
          </div>
          {!bridgeReady ? <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#06182a] text-sm text-cyan-100">Preparing your journey…</div> : null}
        </section>
        {result ? (
          <MiniGameResultPanel
            result={result}
            gameTitle={game.title}
            scoreUnit={game.score.unit}
            isGuest={!loading && isGuest}
            onPlayAgain={handlePlayAgain}
            onSignIn={handleSignIn}
            onBackToCalendar={() => track('back_to_calendar')}
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
