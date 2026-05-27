'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GameEvent } from '@/types'

export function useLayoutEvents(selectedGames: string[]) {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [loading, setLoading] = useState(true)
  const selectedGameKey = selectedGames.join(',')

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const start = new Date()
      start.setDate(start.getDate() - 7)
      const end = new Date()
      end.setDate(end.getDate() + 60)
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      })
      if (selectedGameKey) params.set('game', selectedGameKey)
      const res = await fetch(`/api/events?${params}`)
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [selectedGameKey])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { events, loading, refetch: fetchEvents }
}
