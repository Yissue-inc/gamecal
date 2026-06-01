'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { bezier, bezierTangent, drawDragon, DRAGON_PATH } from './dragon-renderer'
import { trackCinematicSeen } from '@/lib/posthog'
import { markCinematicSeen } from '@/lib/cinematic-seen'
import type { CinematicIntroSettings } from '@/lib/public-ui-settings'

export interface CinematicFeaturedEvent {
  eyebrow: string
  title: string
  titleAccent?: string
  subtitle: string
  accentColor?: string
  eventId?: string
}

interface CinematicIntroProps {
  featured: CinematicFeaturedEvent
  settings?: CinematicIntroSettings
  onDismiss: () => void
  onAddToCalendar?: () => void
}

const TOTAL_DURATION = 5200

interface Ember {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  decay: number
  size: number
  color: string
}

export function CinematicIntro({ featured, settings, onDismiss, onAddToCalendar }: CinematicIntroProps) {
  const atmosRef = useRef<HTMLCanvasElement>(null)
  const dragonRef = useRef<HTMLCanvasElement>(null)
  const animStart = useRef<number | null>(null)
  const rafRef = useRef<number>(0)
  const embersRef = useRef<Ember[]>([])
  const dragonTRef = useRef(0)
  const dragonPhaseRef = useRef(0)
  const dragonActiveRef = useRef(false)
  const dismissedRef = useRef(false)
  const emberTimerRef = useRef(0)

  const accent = settings?.accentColor ?? featured.accentColor ?? '#f59e0b'
  const animationStyle = settings?.animationStyle ?? 'dragon'
  const shouldShowDragonAsset = animationStyle === 'dragon'
  const shouldDrawDragon = animationStyle === 'pixel_dragon'
  const shouldDrawEmbers = shouldShowDragonAsset || shouldDrawDragon || animationStyle === 'embers'
  const autoDismissMs = settings?.autoDismissMs ?? 5500
  const letterboxHeight = settings?.letterboxHeight ?? 80
  const backdropOpacity = settings?.backdropOpacity ?? 40
  const backdropBlur = settings?.backdropBlur ?? 1

  const [phase, setPhase] = useState({
    letterbox: false,
    atmos: false,
    skip: false,
    eyebrow: false,
    title: false,
    sub: false,
    cta: false,
    progress: false,
  })

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    markCinematicSeen()
    trackCinematicSeen(false)
    cancelAnimationFrame(rafRef.current)
    onDismiss()
  }, [onDismiss])

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase((p) => ({ ...p, letterbox: true })), 0),
      setTimeout(() => {
        setPhase((p) => ({ ...p, atmos: true }))
        dragonActiveRef.current = shouldDrawDragon
      }, 200),
      setTimeout(() => setPhase((p) => ({ ...p, skip: true })), 400),
      setTimeout(() => setPhase((p) => ({ ...p, eyebrow: true })), 2600),
      setTimeout(() => setPhase((p) => ({ ...p, title: true })), 2900),
      setTimeout(() => setPhase((p) => ({ ...p, sub: true })), 3300),
      setTimeout(() => setPhase((p) => ({ ...p, cta: true, progress: true })), 3700),
      setTimeout(() => dismiss(), autoDismissMs),
    ]
    return () => timers.forEach(clearTimeout)
  }, [autoDismissMs, dismiss, shouldDrawDragon])

  useEffect(() => {
    const atmosCanvas = atmosRef.current
    const dragCanvas = dragonRef.current
    if (!atmosCanvas || !dragCanvas) return

    const actx = atmosCanvas.getContext('2d')
    const dctx = dragCanvas.getContext('2d')
    if (!actx || !dctx) return

    const fogLayers = Array.from({ length: 3 }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight * 0.3 + i * 80,
      w: 300 + Math.random() * 400,
      h: 80 + Math.random() * 100,
      vx: 0.3 + Math.random() * 0.3,
      alpha: 0.04 + Math.random() * 0.06,
    }))

    const spawnEmber = (x: number, y: number, burst = false) => {
      const count = burst ? 12 : 1
      for (let i = 0; i < count; i++) {
        embersRef.current.push({
          x,
          y,
          vx: (Math.random() - 0.5) * (burst ? 6 : 2),
          vy: -(Math.random() * 3 + 1) * (burst ? 2 : 1),
          life: 1,
          decay: Math.random() * 0.012 + 0.006,
          size: Math.random() * 3 + 1,
          color: Math.random() > 0.5 ? '#f97316' : '#fbbf24',
        })
      }
    }

    const resize = () => {
      atmosCanvas.width = dragCanvas.width = window.innerWidth
      atmosCanvas.height = dragCanvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const render = (ts: number) => {
      if (dismissedRef.current) return
      if (!animStart.current) animStart.current = ts
      const W = dragCanvas.width
      const H = dragCanvas.height
      const scale = Math.min(W, H) * 0.0012

      actx.clearRect(0, 0, W, H)
      dctx.clearRect(0, 0, W, H)

      for (const fog of fogLayers) {
        fog.x += fog.vx
        if (fog.x > W + fog.w) fog.x = -fog.w
        const g = actx.createRadialGradient(fog.x, fog.y, 0, fog.x, fog.y, fog.w * 0.5)
        g.addColorStop(0, `rgba(245,158,11,${fog.alpha})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        actx.fillStyle = g
        actx.beginPath()
        actx.ellipse(fog.x, fog.y, fog.w * 0.5, fog.h * 0.5, 0, 0, Math.PI * 2)
        actx.fill()
      }

      if (shouldDrawDragon && dragonActiveRef.current) {
        dragonTRef.current = Math.min(((ts - (animStart.current + 400)) / (TOTAL_DURATION * 0.5)) * 1.1, 1.05)
        dragonPhaseRef.current += 0.09
        const t = dragonTRef.current

        if (t <= 1.0) {
          const p0 = { x: DRAGON_PATH.p0.x * W, y: DRAGON_PATH.p0.y * H }
          const p1 = { x: DRAGON_PATH.p1.x * W, y: DRAGON_PATH.p1.y * H }
          const p2 = { x: DRAGON_PATH.p2.x * W, y: DRAGON_PATH.p2.y * H }
          const p3 = { x: DRAGON_PATH.p3.x * W, y: DRAGON_PATH.p3.y * H }
          const pos = bezier(Math.min(t, 1), p0, p1, p2, p3)
          const tan = bezierTangent(Math.min(t, 1), p0, p1, p2, p3)
          const angle = Math.atan2(tan.y, tan.x)

          drawDragon(dctx, pos.x, pos.y, angle, t, dragonPhaseRef.current, accent, scale)

          emberTimerRef.current++
          if (emberTimerRef.current % 2 === 0) {
            const fireX = pos.x + Math.cos(angle) * 90
            const fireY = pos.y + Math.sin(angle) * 90
            spawnEmber(fireX, fireY, t > 0.2)
          }
        }
      }

      if (shouldDrawEmbers && !shouldDrawDragon && emberTimerRef.current++ % 5 === 0) {
        spawnEmber(Math.random() * W, H * (0.55 + Math.random() * 0.35), Math.random() > 0.8)
      }

      const embers = embersRef.current
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]
        e.x += e.vx
        e.y += e.vy
        e.vx *= 0.98
        e.vy = e.vy * 0.98 - 0.03
        e.life -= e.decay
        if (e.life <= 0) {
          embers.splice(i, 1)
          continue
        }
        actx.save()
        actx.globalAlpha = e.life * 0.9
        actx.fillStyle = e.color
        actx.shadowColor = e.color
        actx.shadowBlur = 4
        actx.beginPath()
        actx.arc(e.x, e.y, e.size * e.life, 0, Math.PI * 2)
        actx.fill()
        actx.restore()
      }

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [accent, shouldDrawDragon, shouldDrawEmbers])

  const skipToEnd = () => {
    trackCinematicSeen(true)
    setPhase({
      letterbox: true,
      atmos: true,
      skip: true,
      eyebrow: true,
      title: true,
      sub: true,
      cta: true,
      progress: true,
    })
    setTimeout(dismiss, 500)
  }

  const displayFeatured = {
    eyebrow: settings?.eyebrow || featured.eyebrow,
    title: settings?.title || featured.title,
    titleAccent: settings?.titleAccent || featured.titleAccent,
    subtitle: settings?.subtitle || featured.subtitle,
  }
  const titleParts = displayFeatured.title.split('/')
  const titleMain = titleParts[0]?.trim() ?? displayFeatured.title
  const titleSub = displayFeatured.titleAccent ?? titleParts[1]?.trim()

  return (
    <div
      data-testid="cinematic-intro"
      className="fixed inset-0 z-[200] animate-in fade-in duration-300"
      aria-live="polite"
    >
      {/* Calendar peek-through */}
      <div
        className="pointer-events-none fixed inset-0 bg-[#0f0f0f]"
        style={{
          opacity: backdropOpacity / 100,
          backdropFilter: `blur(${backdropBlur}px)`,
        }}
      />

      {/* Letterbox */}
      <div
        className={`fixed left-0 right-0 top-0 z-[210] bg-black transition-all duration-500 ease-out ${
          phase.letterbox ? '' : 'h-0'
        }`}
        style={phase.letterbox ? { height: letterboxHeight } : undefined}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-[210] bg-black transition-all duration-500 ease-out ${
          phase.letterbox ? '' : 'h-0'
        }`}
        style={phase.letterbox ? { height: letterboxHeight } : undefined}
      />

      <canvas
        ref={atmosRef}
        className={`pointer-events-none fixed inset-0 z-[215] transition-opacity duration-700 ${
          phase.atmos ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <canvas ref={dragonRef} className="pointer-events-none fixed inset-0 z-[220]" />

      {shouldShowDragonAsset && (
        <div
          className={`pointer-events-none fixed inset-0 z-[220] overflow-hidden transition-opacity duration-700 ${
            phase.atmos ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        >
          <div className="cinematic-dragon-asset absolute max-w-none" />
        </div>
      )}

      {/* Reward event overlay */}
      <div className="pointer-events-none fixed inset-0 z-[225] flex items-center justify-center px-4 py-20">
        <div
          className={`grid w-full max-w-5xl overflow-hidden rounded-lg border border-violet-400/25 bg-zinc-950/95 shadow-2xl shadow-violet-950/50 transition-all duration-700 md:grid-cols-[1.25fr_0.75fr] ${
            phase.atmos ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.98] opacity-0'
          }`}
        >
          <div className="relative min-h-[240px] border-b border-violet-400/20 bg-black md:min-h-[430px] md:border-b-0 md:border-r">
            <Image
              src="/gamerclock-reward.png"
              alt="GamerClock Steam gift card giveaway"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 62vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-8">
            <p
              className={`text-[11px] font-bold uppercase tracking-[0.35em] transition-all duration-600 ${
                phase.eyebrow ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              }`}
              style={{ color: accent }}
            >
              {displayFeatured.eyebrow}
            </p>
            <h2
              className={`mt-4 font-rajdhani text-4xl font-black leading-none tracking-tight text-white transition-all duration-700 sm:text-5xl ${
                phase.title ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0'
              }`}
              style={{ textShadow: `0 0 80px ${accent}88` }}
            >
              {titleMain}
              {titleSub && (
                <>
                  <br />
                  <span style={{ color: accent }}>{titleSub}</span>
                </>
              )}
            </h2>
            <p
              className={`mt-4 text-sm leading-6 text-zinc-300 transition-opacity duration-600 sm:text-base ${
                phase.sub ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {displayFeatured.subtitle}
            </p>
            <div className="mt-5 grid gap-2 text-sm text-zinc-300">
              <div className="rounded-md border border-violet-400/20 bg-violet-500/10 px-3 py-2">
                Steam $10 Gift Card x 5 winners
              </div>
              <div className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2">
                Silver tier or higher can enter after login.
              </div>
            </div>
            <div
              className={`pointer-events-auto mt-6 flex flex-wrap gap-3 transition-all duration-500 ${
                phase.cta ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              }`}
            >
              <button
                type="button"
                data-testid="cinematic-add-btn"
                className="rounded-md px-7 py-3 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5"
                style={{ backgroundColor: accent, boxShadow: `0 0 24px ${accent}66` }}
                onClick={() => {
                  onAddToCalendar?.()
                  dismiss()
                }}
              >
                {settings?.primaryCta || 'Enter Giveaway'}
              </button>
              <button
                type="button"
                data-testid="cinematic-view-btn"
                className="rounded-md border border-zinc-600 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-400 hover:text-white"
                onClick={dismiss}
              >
                {settings?.secondaryCta || 'View Calendar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`fixed left-7 top-24 z-[230] text-sm font-black tracking-wide text-white/40 transition-opacity ${
          phase.letterbox ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {(settings?.brandLabel || 'GamerClock').replace(/Clock$/, '')}
        <span className="text-indigo-400/70">
          {(settings?.brandLabel || 'GamerClock').endsWith('Clock') ? 'Clock' : ''}
        </span>
      </div>

      {phase.skip && (
        <button
          type="button"
          data-testid="cinematic-skip"
          className="fixed right-7 top-24 z-[230] rounded border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 backdrop-blur-md transition hover:bg-white/20 hover:text-white"
          onClick={skipToEnd}
        >
          Skip →
        </button>
      )}

      <div
        className={`fixed bottom-[5.5rem] right-7 z-[230] text-[9px] uppercase tracking-[0.2em] text-white/30 ${
          phase.letterbox ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {settings?.sponsorLabel || 'Sponsored'}
      </div>

      {phase.progress && (
        <div className="fixed bottom-[5.25rem] left-1/2 z-[230] h-0.5 w-[120px] -translate-x-1/2 overflow-hidden rounded bg-white/15">
          <div
            className="h-full bg-amber-500 transition-all [transition-duration:1800ms] ease-linear"
            style={{ width: phase.progress ? '100%' : '0%' }}
          />
        </div>
      )}

      <style jsx global>{`
        .cinematic-dragon-asset {
          width: min(82vw, 1120px);
          aspect-ratio: 3 / 2;
          background-image: url('/assets/cinematic/dragon-ai.png');
          background-position: center;
          background-repeat: no-repeat;
          background-size: contain;
          transform-origin: 58% 50%;
          animation: cinematic-dragon-asset-flight 4.2s cubic-bezier(0.2, 0.82, 0.2, 1) 180ms both;
          filter: contrast(1.08) saturate(1.06) drop-shadow(0 0 26px rgba(245, 158, 11, 0.28))
            drop-shadow(0 20px 48px rgba(0, 0, 0, 0.72));
          -webkit-mask-image: radial-gradient(
            ellipse at 50% 50%,
            #000 0%,
            #000 48%,
            rgba(0, 0, 0, 0.82) 61%,
            transparent 78%
          );
          mask-image: radial-gradient(
            ellipse at 50% 50%,
            #000 0%,
            #000 48%,
            rgba(0, 0, 0, 0.82) 61%,
            transparent 78%
          );
        }

        @keyframes cinematic-dragon-asset-flight {
          0% {
            transform: translate3d(-62vw, 43vh, 0) scale(0.58) rotate(-8deg);
            opacity: 0;
          }
          12% {
            opacity: 0.98;
          }
          46% {
            transform: translate3d(14vw, 18vh, 0) scale(0.9) rotate(-2deg);
            opacity: 0.98;
          }
          74% {
            transform: translate3d(48vw, 10vh, 0) scale(0.84) rotate(2deg);
            opacity: 0.9;
          }
          100% {
            transform: translate3d(104vw, -8vh, 0) scale(0.68) rotate(8deg);
            opacity: 0;
          }
        }

        @media (max-width: 767px) {
          .cinematic-dragon-asset {
            width: min(150vw, 780px);
            animation-duration: 4s;
          }

          @keyframes cinematic-dragon-asset-flight {
            0% {
              transform: translate3d(-102vw, 46vh, 0) scale(0.58) rotate(-8deg);
              opacity: 0;
            }
            14% {
              opacity: 0.96;
            }
            52% {
              transform: translate3d(-4vw, 20vh, 0) scale(0.72) rotate(-2deg);
              opacity: 0.96;
            }
            100% {
              transform: translate3d(86vw, 2vh, 0) scale(0.6) rotate(8deg);
              opacity: 0;
            }
          }
        }
      `}</style>
    </div>
  )
}

export function CinematicIntroLink() {
  return (
    <Link href="/?replay=cinematic" className="text-xs text-zinc-500 hover:text-zinc-300">
      Replay intro
    </Link>
  )
}
