'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import type { NewRelease } from '@/types'

export default function AdminReleasesPage() {
  const [releases, setReleases] = useState<NewRelease[]>([])

  useEffect(() => {
    fetch('/api/new-releases')
      .then((r) => r.json())
      .then((d) => setReleases(d.releases ?? []))
  }, [])

  const featuredCount = releases.filter((r) => r.is_featured).length

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-2 text-2xl font-bold">New Releases</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Featured: {featuredCount}/3 max
      </p>
      <div className="space-y-4">
        {releases.map((release) => (
          <div
            key={release.id}
            className="flex items-center justify-between rounded-lg border border-zinc-800 p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{release.title}</span>
                {release.is_featured && <Badge>Featured</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {release.developer} · {release.release_date}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Featured</span>
              <Switch checked={release.is_featured} disabled />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Use POST /api/new-releases with admin Authorization to add releases.
      </p>
    </main>
  )
}
