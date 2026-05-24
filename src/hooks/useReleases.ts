'use client'

import { useState, useEffect, useCallback } from 'react'
import type { NewRelease } from '@/types'

export function useReleases() {
  const [releases, setReleases] = useState<NewRelease[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReleases = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/new-releases')
      if (!res.ok) throw new Error('Failed to fetch releases')
      const data = await res.json()
      setReleases(data.releases ?? [])
    } catch {
      setReleases([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReleases()
  }, [fetchReleases])

  return { releases, loading, refetch: fetchReleases }
}
