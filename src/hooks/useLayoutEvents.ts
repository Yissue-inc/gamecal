'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GameEvent } from '@/types'

const eventsCache = new Map<string, GameEvent[]>()
const eventsRequests = new Map<string, Promise<GameEvent[]>>()

export function useLayoutEvents(selectedGames: string[]) {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [loading, setLoading] = useState(true)
  const selectedGameKey = selectedGames.join(',')

  const fetchEvents = useCallback(async (force = false) => {
    setLoading(true)
    try {
      const start = new Date()
      start.setDate(start.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setDate(end.getDate() + 60)
      end.setHours(23, 59, 59, 999)
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      })
      if (selectedGameKey) params.set('game', selectedGameKey)
      const key = params.toString()
      const cached = eventsCache.get(key)
      if (cached && !force) {
        setEvents(cached)
        return
      }

      let request = eventsRequests.get(key)
      if (!request || force) {
        request = fetch(`/api/events?${key}`)
          .then((res) => res.json())
          .then((data) => data.events ?? [])
          .finally(() => {
            eventsRequests.delete(key)
          })
        eventsRequests.set(key, request)
      }

      const nextEvents = await request
      eventsCache.set(key, nextEvents)
      setEvents(nextEvents)
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [selectedGameKey])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { events, loading, refetch: () => fetchEvents(true) }
}
