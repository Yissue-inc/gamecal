'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { getReleaseRemindersLocal, toggleReleaseReminderLocal } from '@/lib/engagement-store'
import { ensurePushSubscription } from '@/lib/push'
import { trackReminderSet } from '@/lib/posthog'

const OFFSETS = [
  { label: 'On release day', value: 0 },
  { label: '1 day before', value: 1440 },
  { label: '1 week before', value: 10080 },
]

interface ReleaseReminderPickerProps {
  releaseId: string
  releaseDate: string
}

export function ReleaseReminderPicker({ releaseId, releaseDate }: ReleaseReminderPickerProps) {
  const { user, isGuest } = useAuth()
  const [activeOffsets, setActiveOffsets] = useState<number[]>([])

  useEffect(() => {
    let cancelled = false

    if (user) {
      fetch('/api/release-reminders')
        .then((res) => (res.ok ? res.json() : { reminders: [] }))
        .then((data) => {
          if (cancelled) return
          const offsets = (data.reminders ?? [])
            .filter((reminder: { release_id: string }) => reminder.release_id === releaseId)
            .map((reminder: { offset_min: number }) => reminder.offset_min)
          setActiveOffsets(offsets)
        })
        .catch(() => setActiveOffsets(getReleaseRemindersLocal(releaseId)))
    } else {
      setActiveOffsets(getReleaseRemindersLocal(releaseId))
    }

    return () => {
      cancelled = true
    }
  }, [releaseId, user])

  const releaseAt = `${releaseDate}T09:00:00.000Z`

  const toggleOffset = async (offsetMin: number) => {
    if (isGuest || !user) {
      window.dispatchEvent(new CustomEvent('cal:prompt-login', { detail: { reason: 'reminder' } }))
      return
    }

    const wasActive = activeOffsets.includes(offsetMin)
    const optimistic = wasActive
      ? activeOffsets.filter((offset) => offset !== offsetMin)
      : [...activeOffsets, offsetMin]
    setActiveOffsets(optimistic)

    try {
      if (wasActive) {
        const res = await fetch(`/api/release-reminders?release_id=${releaseId}&offset_min=${offsetMin}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error('Reminder remove failed')
        toast.success('Release reminder removed')
        return
      }

      const res = await fetch('/api/release-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId, offsetMin }),
      })
      if (!res.ok) throw new Error('Reminder save failed')

      let push: Awaited<ReturnType<typeof ensurePushSubscription>>
      try {
        push = await ensurePushSubscription()
      } catch {
        push = { ok: false, reason: 'push-subscribe-failed' }
      }

      const next = toggleReleaseReminderLocal(releaseId, offsetMin, releaseAt)
      setActiveOffsets(Array.from(new Set([...optimistic, ...next])))
      trackReminderSet(releaseId, offsetMin)
      if (push.ok) {
        toast.success('Release reminder set. CAL will notify this browser.')
      } else {
        const reason =
          push.reason === 'permission-denied'
            ? 'notification permission was not granted'
            : push.reason === 'missing-vapid-public-key'
              ? 'production push keys are not configured'
              : 'browser push is not available yet'
        toast.success(`Release reminder saved. Push is pending because ${reason}.`)
      }
    } catch {
      const next = toggleReleaseReminderLocal(releaseId, offsetMin, releaseAt)
      setActiveOffsets(next)
      if (!wasActive && next.includes(offsetMin)) {
        toast.success('Saved locally. Cloud release reminder sync needs the latest database migration.', { icon: '🔔' })
      } else {
        toast.error('Could not update release reminder. Please try again.')
      }
    }
  }

  return (
    <div data-testid="release-reminder-picker" className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        <Bell className="h-3.5 w-3.5" />
        <span>Remind me</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {OFFSETS.map((offset) => {
          const active = activeOffsets.includes(offset.value)
          return (
            <button
              key={offset.value}
              type="button"
              data-testid={`release-reminder-offset-${offset.value}`}
              onClick={() => toggleOffset(offset.value)}
              className={`rounded-md border px-3 py-1 text-xs font-medium transition-all ${
                active
                  ? 'border-indigo-600 bg-indigo-950/60 text-indigo-300'
                  : 'border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              {active ? '✓ ' : ''}
              {offset.label}
            </button>
          )
        })}
      </div>
      <p className="text-[10px] text-zinc-600">CAL will push a release reminder to your browser</p>
    </div>
  )
}
