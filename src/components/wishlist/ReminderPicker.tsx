'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getRemindersLocal, toggleReminderLocal } from '@/lib/engagement-store'
import { ensurePushSubscription } from '@/lib/push'
import { trackReminderSet } from '@/lib/posthog'
import { toast } from 'sonner'

const OFFSETS = [
  { label: '10 min before', value: 10 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
]

interface ReminderPickerProps {
  eventId: string
  eventStartAt: string
}

export function ReminderPicker({ eventId, eventStartAt }: ReminderPickerProps) {
  const { user, isGuest } = useAuth()
  const [activeOffsets, setActiveOffsets] = useState<number[]>([])

  useEffect(() => {
    let cancelled = false

    if (user) {
      fetch('/api/reminders')
        .then((res) => (res.ok ? res.json() : { reminders: [] }))
        .then((data) => {
          if (cancelled) return
          const offsets = (data.reminders ?? [])
            .filter((reminder: { event_id: string }) => reminder.event_id === eventId)
            .map((reminder: { offset_min: number }) => reminder.offset_min)
          setActiveOffsets(offsets)
        })
        .catch(() => setActiveOffsets(getRemindersLocal(eventId)))
    } else {
      setActiveOffsets(getRemindersLocal(eventId))
    }

    return () => {
      cancelled = true
    }
  }, [eventId, user])

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
        const res = await fetch(`/api/reminders?event_id=${eventId}&offset_min=${offsetMin}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error('Reminder remove failed')
        toast.success('Reminder removed')
        return
      }

      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, offsetMin }),
      })
      if (!res.ok) throw new Error('Reminder save failed')

      let push: Awaited<ReturnType<typeof ensurePushSubscription>>
      try {
        push = await ensurePushSubscription()
      } catch {
        push = { ok: false, reason: 'push-subscribe-failed' }
      }

      const next = toggleReminderLocal(eventId, offsetMin, eventStartAt)
      setActiveOffsets(Array.from(new Set([...optimistic, ...next])))
      trackReminderSet(eventId, offsetMin)
      if (push.ok) {
        toast.success('Reminder set. CAL will notify this browser.')
      } else {
        const reason =
          push.reason === 'permission-denied'
            ? 'notification permission was not granted'
            : push.reason === 'missing-vapid-public-key'
              ? 'production push keys are not configured'
              : 'browser push is not available yet'
        toast.success(`Reminder saved. Push is pending because ${reason}.`)
      }
    } catch {
      setActiveOffsets(activeOffsets)
      toast.error('Could not update reminder. Please try again.')
    }
  }

  return (
    <div data-testid="reminder-picker" className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        <Bell className="h-3.5 w-3.5" />
        <span>Remind me</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OFFSETS.map((o) => {
          const active = activeOffsets.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              data-testid={`reminder-offset-${o.value}`}
              onClick={() => toggleOffset(o.value)}
              className={`min-h-9 rounded-md border px-2 py-1 text-center text-xs font-medium transition-all ${
                active
                  ? 'border-indigo-600 bg-indigo-950/60 text-indigo-300'
                  : 'border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              {active ? '✓ ' : ''}
              {o.label}
            </button>
          )
        })}
      </div>
      <p className="text-[10px] text-zinc-600">CAL will push a notification to your browser</p>
    </div>
  )
}
