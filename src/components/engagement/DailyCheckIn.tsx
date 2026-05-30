'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  checkInLocal,
  getAttendanceLocal,
  getPrestigeLevel,
  isCheckedInToday,
} from '@/lib/engagement-store'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { trackCheckinDone } from '@/lib/posthog'
import { getCalStreakMessage } from '@/lib/cal-messages'
import { CalCharacter } from './CalCharacter'
import { toast } from 'sonner'

function recordDragonCheckInPresence() {
  fetch('/api/dragon-presence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'checkin' }),
  }).catch(() => undefined)
}

function showDragonCheckInToast(streak: number) {
  toast.success('Dragon presence increased', {
    description: `Day ${streak} secured. Your streak is feeding today's level.`,
    icon: '🐉',
  })
}

export function DailyCheckIn() {
  const { user, isGuest } = useAuth()
  const [streak, setStreak] = useState(0)
  const [todayChecked, setTodayChecked] = useState(false)
  const [justChecked, setJustChecked] = useState(false)
  const useApi = isSupabaseConfigured()

  useEffect(() => {
    const handleMilestone = (event: Event) => {
      const gp = (event as CustomEvent<{ gp?: number }>).detail?.gp ?? 0
      const prestige = getPrestigeLevel(gp)
      toast.success('Prestige unlocked!', {
        description: `You reached ${gp} GP - ${prestige.label} tier.`,
        icon: prestige.emoji,
        duration: 5000,
      })
    }

    window.addEventListener('gamecal:gp-milestone', handleMilestone)
    return () => window.removeEventListener('gamecal:gp-milestone', handleMilestone)
  }, [])

  useEffect(() => {
    if (useApi && user) {
      fetch('/api/checkin')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) {
            setStreak(d.currentStreak ?? 0)
            setTodayChecked(!!d.checkedToday)
          }
        })
        .catch(() => {
          const state = getAttendanceLocal()
          setStreak(state.currentStreak)
          setTodayChecked(isCheckedInToday())
        })
    } else {
      const state = getAttendanceLocal()
      setStreak(state.currentStreak)
      setTodayChecked(isCheckedInToday())
    }
  }, [useApi, user])

  if (isGuest || !user) return null

  const handleCheckIn = async () => {
    if (useApi) {
      const res = await fetch('/api/checkin', { method: 'POST' })
      if (res.ok) {
        const d = await res.json()
        setStreak(d.currentStreak ?? 0)
        setTodayChecked(true)
        setJustChecked(true)
        if (!d.alreadyChecked) {
          trackCheckinDone(d.currentStreak ?? 0)
          recordDragonCheckInPresence()
          showDragonCheckInToast(d.currentStreak ?? 0)
        }
        window.dispatchEvent(new Event('gamecal:checkin'))
        setTimeout(() => setJustChecked(false), 4000)
        return
      }
    }

    const next = checkInLocal()
    setStreak(next.currentStreak)
    setTodayChecked(true)
    setJustChecked(true)
    trackCheckinDone(next.currentStreak)
    recordDragonCheckInPresence()
    showDragonCheckInToast(next.currentStreak)
    window.dispatchEvent(new Event('gamecal:checkin'))
    setTimeout(() => setJustChecked(false), 4000)
  }

  return (
    <div
      data-testid="daily-check-in"
      className={`mx-4 mb-2 flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
        todayChecked
          ? 'border-indigo-800 bg-indigo-950/30'
          : 'border-zinc-700 bg-zinc-900/50 hover:border-indigo-800'
      }`}
      onClick={!todayChecked ? handleCheckIn : undefined}
      role={todayChecked ? undefined : 'button'}
    >
      <CalCharacter mood={justChecked ? 'happy' : todayChecked ? 'idle' : 'alert'} />
      <div className="min-w-0 flex-1">
        {justChecked ? (
          <p data-testid="cal-checkin-message" className="text-sm font-semibold text-indigo-300">
            {getCalStreakMessage(streak)}
          </p>
        ) : todayChecked ? (
          <p className="text-sm text-zinc-400">
            <span className="font-semibold text-white">Day {streak}</span> streak · Checked in ✓
          </p>
        ) : (
          <p className="text-sm text-zinc-300">
            <span className="font-semibold text-white">Check in</span>
            {' · '}
            {streak > 0 ? `${streak}-day streak active` : 'Start your streak'}
          </p>
        )}
        <div className="mt-1.5 flex gap-0.5">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <div
              key={d}
              data-testid={`streak-bar-${d}`}
              className={`h-1 flex-1 rounded-full ${
                d <= (streak % 7 || (todayChecked ? 7 : 0)) ? 'bg-indigo-500' : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div data-testid="streak-count" className="text-xs font-bold text-indigo-400">
          🔥 {streak}d
        </div>
        {!todayChecked && <div className="text-[10px] text-zinc-500">tap to check in</div>}
      </div>
    </div>
  )
}
