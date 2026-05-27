'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GameEvent } from '@/types'

interface UseEventsOptions {
  start?: string
  end?: string
  games?: string[]
}

export function useEvents({ start, end, games }: UseEventsOptions = {}) {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const gameKey = games?.join(',') ?? ''

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (start) params.set('start', start)
      if (end) params.set('end', end)
      if (gameKey) params.set('game', gameKey)

      const res = await fetch(`/api/events?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch events')
      const data = await res.json()
      setEvents(data.events ?? data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [start, end, gameKey])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { events, loading, error, refetch: fetchEvents }
}
