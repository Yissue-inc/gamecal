'use client'

import { useState, useEffect, useCallback } from 'react'
import type { NewRelease } from '@/types'

let releasesCache: NewRelease[] | null = null
let releasesRequest: Promise<NewRelease[]> | null = null

export function useReleases() {
  const [releases, setReleases] = useState<NewRelease[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReleases = useCallback(async (force = false) => {
    setLoading(true)
    try {
      if (releasesCache && !force) {
        setReleases(releasesCache)
        return
      }

      if (!releasesRequest || force) {
        releasesRequest = fetch('/api/new-releases')
          .then((res) => {
            if (!res.ok) throw new Error('Failed to fetch releases')
            return res.json()
          })
          .then((data) => data.releases ?? [])
      }

      const nextReleases = await releasesRequest
      releasesCache = nextReleases
      releasesRequest = null
      setReleases(nextReleases)
    } catch {
      releasesRequest = null
      setReleases([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReleases()
  }, [fetchReleases])

  return { releases, loading, refetch: () => fetchReleases(true) }
}
