'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getAttendanceLocal } from '@/lib/engagement-store'
import { isSupabaseConfigured } from '@/lib/mock-data'

const DAILY_VISITS_KEY = 'gamerclock-dragon-visits'
const SESSION_COUNTED_PREFIX = 'gamerclock-dragon-session-counted'

interface DailyVisitState {
  date: string
  count: number
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function readDailyVisits(): DailyVisitState {
  if (typeof window === 'undefined') return { date: todayKey(), count: 0 }

  try {
    const parsed = JSON.parse(localStorage.getItem(DAILY_VISITS_KEY) ?? '{}') as Partial<DailyVisitState>
    const today = todayKey()
    if (parsed.date !== today) return { date: today, count: 0 }
    return { date: today, count: Math.max(0, Number(parsed.count ?? 0)) }
  } catch {
    return { date: todayKey(), count: 0 }
  }
}

function recordSessionVisit(): number {
  const today = todayKey()
  const sessionKey = `${SESSION_COUNTED_PREFIX}-${today}`
  const current = readDailyVisits()

  if (sessionStorage.getItem(sessionKey) === '1') return current.count

  const next = { date: today, count: current.count + 1 }
  localStorage.setItem(DAILY_VISITS_KEY, JSON.stringify(next))
  sessionStorage.setItem(sessionKey, '1')
  return next.count
}

function getDragonLevel(visits: number, streak: number) {
  if (streak >= 30 || visits >= 9) return 4
  if (streak >= 7 || visits >= 5) return 3
  if (streak >= 3 || visits >= 3) return 2
  return 1
}

export function DragonPresence() {
  const { user, isGuest } = useAuth()
  const [visitCount, setVisitCount] = useState(1)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    setVisitCount(recordSessionVisit())
  }, [])

  useEffect(() => {
    let cancelled = false

    if (isSupabaseConfigured() && user) {
      fetch('/api/checkin')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data) setStreak(data.currentStreak ?? 0)
        })
        .catch(() => {
          if (!cancelled) setStreak(getAttendanceLocal().currentStreak)
        })
      return () => {
        cancelled = true
      }
    }

    setStreak(getAttendanceLocal().currentStreak)
    return () => {
      cancelled = true
    }
  }, [user])

  const level = useMemo(() => getDragonLevel(visitCount, streak), [visitCount, streak])
  const opacity = isGuest ? 0.1 + level * 0.025 : 0.13 + level * 0.035
  const scale = 0.88 + level * 0.05

  return (
    <div
      data-testid="dragon-presence"
      data-dragon-level={level}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="dragon-presence-silhouette absolute"
        style={
          {
            '--dragon-opacity': opacity,
            '--dragon-scale': scale,
          } as CSSProperties
        }
      />
      <div className="dragon-presence-glow absolute" />
      <style jsx>{`
        .dragon-presence-silhouette {
          right: -18vw;
          top: 12vh;
          width: min(64vw, 920px);
          aspect-ratio: 3 / 2;
          background-image: url('/assets/cinematic/dragon-ai.png');
          background-position: center;
          background-repeat: no-repeat;
          background-size: contain;
          opacity: var(--dragon-opacity);
          transform: scale(var(--dragon-scale)) rotate(-3deg);
          filter: grayscale(0.15) contrast(1.12) saturate(0.9) drop-shadow(0 0 42px rgba(245, 158, 11, 0.14));
          -webkit-mask-image: radial-gradient(ellipse at center, #000 0%, #000 47%, rgba(0, 0, 0, 0.72) 61%, transparent 78%);
          mask-image: radial-gradient(ellipse at center, #000 0%, #000 47%, rgba(0, 0, 0, 0.72) 61%, transparent 78%);
          animation: dragon-presence-breathe 8s ease-in-out infinite;
        }

        .dragon-presence-glow {
          right: 4vw;
          top: 30vh;
          width: min(36vw, 460px);
          height: min(20vw, 240px);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.11), transparent 68%);
          filter: blur(18px);
          opacity: calc(var(--dragon-opacity) * 1.8);
          animation: dragon-presence-glow 6s ease-in-out infinite;
        }

        @keyframes dragon-presence-breathe {
          0%, 100% {
            transform: scale(var(--dragon-scale)) rotate(-3deg) translate3d(0, 0, 0);
          }
          50% {
            transform: scale(calc(var(--dragon-scale) + 0.025)) rotate(-2deg) translate3d(-1.2vw, -0.8vh, 0);
          }
        }

        @keyframes dragon-presence-glow {
          0%, 100% {
            opacity: calc(var(--dragon-opacity) * 1.2);
          }
          50% {
            opacity: calc(var(--dragon-opacity) * 2.2);
          }
        }

        @media (max-width: 767px) {
          .dragon-presence-silhouette {
            right: -46vw;
            top: 19vh;
            width: 150vw;
            opacity: calc(var(--dragon-opacity) * 0.72);
          }

          .dragon-presence-glow {
            right: -8vw;
            top: 31vh;
            width: 72vw;
            height: 32vw;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .dragon-presence-silhouette,
          .dragon-presence-glow {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
