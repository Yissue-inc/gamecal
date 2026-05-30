'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  getRecurringReminderLocal,
  getRemindersLocal,
  setRecurringReminderLocal,
  toggleReminderLocal,
} from '@/lib/engagement-store'
import { ensurePushSubscription } from '@/lib/push'
import { trackReminderSet } from '@/lib/posthog'
import { toast } from 'sonner'
import type { EventType } from '@/types'

const OFFSETS = [
  { label: '10 min before', value: 10 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
]

interface ReminderPickerProps {
  eventId: string
  eventStartAt: string
  eventType?: EventType
  isRecurring?: boolean
}

export function ReminderPicker({ eventId, eventStartAt, eventType, isRecurring = false }: ReminderPickerProps) {
  const { user, isGuest } = useAuth()
  const [activeOffsets, setActiveOffsets] = useState<number[]>([])
  const [recurringOffset, setRecurringOffset] = useState<number | null>(null)

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
    setRecurringOffset(eventType ? getRecurringReminderLocal(eventType) : null)

    return () => {
      cancelled = true
    }
  }, [eventId, eventType, user])

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
        body: JSON.stringify({ eventId, offsetMin, recurring: false }),
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

  const toggleRecurring = async () => {
    if (!eventType) return
    if (isGuest || !user) {
      window.dispatchEvent(new CustomEvent('cal:prompt-login', { detail: { reason: 'recurring-reminder' } }))
      return
    }

    const selectedOffset = recurringOffset ?? activeOffsets[0] ?? 60
    const nextOffset = recurringOffset === null ? selectedOffset : null
    setRecurringOffset(nextOffset)
    setRecurringReminderLocal(eventType, nextOffset)

    try {
      if (nextOffset === null) {
        const params = new URLSearchParams({
          event_id: eventId,
          offset_min: String(selectedOffset),
          recurring: 'true',
        })
        const res = await fetch(`/api/reminders?${params.toString()}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Recurring reminder remove failed')
        toast.success('Recurring reminder removed')
        return
      }

      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, offsetMin: nextOffset, recurring: true, eventType }),
      })
      if (!res.ok) throw new Error('Recurring reminder save failed')

      try {
        await ensurePushSubscription()
      } catch {
        // The reminder still saves; the existing toast tells the user push may need permission.
      }
      toast.success('Recurring reminder set. CAL will remind you every reset.')
    } catch {
      setRecurringOffset(recurringOffset)
      setRecurringReminderLocal(eventType, recurringOffset)
      toast.error('Could not update recurring reminder. Please try again.')
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
      {isRecurring && eventType && (
        <label
          data-testid="recurring-reminder-toggle"
          className="mt-1 flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400"
        >
          <input
            type="checkbox"
            checked={recurringOffset !== null}
            onChange={toggleRecurring}
            className="mt-0.5 accent-indigo-500"
          />
          <span>
            <span className="block font-semibold text-zinc-300">Remind me every time this resets</span>
            <span className="mt-0.5 block text-[11px] text-zinc-500">
              Uses {OFFSETS.find((offset) => offset.value === (recurringOffset ?? activeOffsets[0] ?? 60))?.label ?? '1 hour before'}.
            </span>
          </span>
        </label>
      )}
      <p className="text-[10px] text-zinc-600">CAL will push a notification to your browser</p>
    </div>
  )
}
