'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { BadgeGallery } from '@/components/engagement/BadgeGallery'
import { CalCharacter } from '@/components/engagement/CalCharacter'
import { DailyCheckIn } from '@/components/engagement/DailyCheckIn'
import {
  getAttendanceLocal,
  getGpLocal,
  getPrestigeLevel,
} from '@/lib/engagement-store'
import { useEffect, useState } from 'react'

export default function ProfilePage() {
  const { user, isGuest } = useAuth()
  const [stats, setStats] = useState({ streak: 0, totalDays: 0, gp: 0 })

  useEffect(() => {
    const attendance = getAttendanceLocal()
    setStats({
      streak: attendance.currentStreak,
      totalDays: attendance.totalDays,
      gp: getGpLocal(),
    })
  }, [])

  const prestige = getPrestigeLevel(stats.gp)

  if (isGuest || !user) {
    return (
      <div className="min-h-screen bg-[#0f0f0f]" data-testid="profile-page">
        <header className="border-b border-zinc-800 px-6 py-4">
          <Link href="/" className="font-rajdhani text-xl font-bold">
            Gamer<span className="text-primary">Clock</span>
          </Link>
          <h1 className="font-rajdhani mt-4 text-2xl font-semibold">Profile</h1>
          <p className="mt-2 text-sm text-zinc-400">
            <Link href="/" className="text-indigo-400 hover:underline">Sign in</Link> to track streaks and GP.
          </p>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-8">
          <section>
            <h2 className="font-rajdhani mb-4 text-lg font-semibold">Badges</h2>
            <BadgeGallery />
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="profile-page">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="font-rajdhani text-xl font-bold">
          Gamer<span className="text-primary">Clock</span>
        </Link>
        <h1 className="font-rajdhani mt-4 text-2xl font-semibold">Profile</h1>
      </header>
      <main className="mx-auto max-w-3xl space-y-8 px-6 py-8">
        <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <CalCharacter mood="happy" size="lg" />
          <div>
            <p className="text-sm text-zinc-400">{user.email}</p>
            <p data-testid="prestige-level" className="mt-1 text-lg font-bold text-white">
              {prestige.emoji} {prestige.label}
            </p>
            <p data-testid="gp-count" className="text-xs text-zinc-500">{stats.gp} GP</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div data-testid="stat-streak" className="rounded-lg border border-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-indigo-400">{stats.streak}</div>
            <div className="text-xs text-zinc-500">Day streak</div>
          </div>
          <div data-testid="stat-total-days" className="rounded-lg border border-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.totalDays}</div>
            <div className="text-xs text-zinc-500">Total check-ins</div>
          </div>
          <div className="rounded-lg border border-zinc-800 p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.gp}</div>
            <div className="text-xs text-zinc-500">Gamer Points</div>
          </div>
        </div>
        <section>
          <h2 className="font-rajdhani mb-4 text-lg font-semibold">Daily Check-in</h2>
          <div className="-mx-4">
            <DailyCheckIn />
          </div>
        </section>
        <section>
          <h2 className="font-rajdhani mb-4 text-lg font-semibold">Badges</h2>
          <BadgeGallery />
        </section>
      </main>
    </div>
  )
}
