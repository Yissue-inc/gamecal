'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getRemindersLocal, toggleReminderLocal } from '@/lib/engagement-store'

const OFFSETS = [
  { label: '10 min before', value: 10 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
  { label: '1 week before', value: 10080 },
]

interface ReminderPickerProps {
  eventId: string
  eventStartAt: string
}

export function ReminderPicker({ eventId, eventStartAt }: ReminderPickerProps) {
  const { user, isGuest } = useAuth()
  const [activeOffsets, setActiveOffsets] = useState<number[]>([])

  useEffect(() => {
    setActiveOffsets(getRemindersLocal(eventId))
  }, [eventId])

  const toggleOffset = async (offsetMin: number) => {
    if (isGuest || !user) {
      window.dispatchEvent(new CustomEvent('cal:prompt-login', { detail: { reason: 'reminder' } }))
      return
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    const next = toggleReminderLocal(eventId, offsetMin, eventStartAt)
    setActiveOffsets(next)
  }

  return (
    <div data-testid="reminder-picker" className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        <Bell className="h-3.5 w-3.5" />
        <span>Remind me</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {OFFSETS.map((o) => {
          const active = activeOffsets.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              data-testid={`reminder-offset-${o.value}`}
              onClick={() => toggleOffset(o.value)}
              className={`rounded-md border px-3 py-1 text-xs font-medium transition-all ${
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
