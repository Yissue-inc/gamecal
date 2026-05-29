'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { adminFetch } from '@/lib/admin-fetch'
import { withGamerClockUtm } from '@/lib/utils'
import type { NewRelease } from '@/types'
import { toast } from 'sonner'

export default function AdminReleasesPage() {
  const [releases, setReleases] = useState<NewRelease[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await adminFetch('/api/new-releases')
    const data = await res.json()
    setReleases(data.releases ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const updateRelease = async (id: string, patch: Partial<NewRelease>) => {
    const res = await adminFetch(`/api/new-releases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
    const data = await res.json()
    if (res.ok) {
      setReleases((prev) => prev.map((r) => (r.id === id ? { ...r, ...data.release } : r)))
      toast.success('Updated')
    } else {
      toast.error(data.error ?? 'Update failed')
    }
  }

  const featuredCount = releases.filter((r) => r.is_featured).length

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">New Releases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Featured: {featuredCount}/3 max · {releases.length} total · Published {releases.filter((r) => r.is_published !== false).length}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load}>Refresh</Button>
          <Button variant="outline" asChild>
            <a href="/" target="_blank" rel="noopener noreferrer">Verify Calendar</a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/new-releases" target="_blank" rel="noopener noreferrer">Public Page</a>
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : releases.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">
          No approved New Releases yet. Approve candidates from the Release Candidate Queue.
        </div>
      ) : (
        <div className="space-y-4">
          {releases.map((release) => (
            <div
              key={release.id}
              className="rounded-lg border border-zinc-800 p-4"
              style={{
                background: `linear-gradient(135deg, ${release.hero_color ?? '#1b2838'}33 0%, #1a1a1a 60%)`,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 gap-4">
                  <div
                    className="hidden h-24 w-40 shrink-0 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 bg-cover bg-center sm:block"
                    style={{
                      backgroundImage: release.image_url
                        ? `linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0.05)), url(${release.image_url})`
                        : `linear-gradient(135deg, ${release.hero_color ?? '#1b2838'}66, #18181b)`,
                    }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{release.title}</span>
                    {release.is_featured && <Badge>Featured</Badge>}
                    {release.is_published === false && (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {release.developer} · {release.release_date}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {release.platform.map((platform) => (
                      <Badge key={platform} variant="outline" className="border-zinc-700 text-zinc-300">
                        {platform === 'PS5' ? 'PlayStation' : platform === 'Switch' ? 'Nintendo Switch' : platform}
                      </Badge>
                    ))}
                  </div>
                  {release.description && (
                    <p className="mt-2 line-clamp-2 max-w-2xl text-xs text-zinc-500">{release.description}</p>
                  )}
                  {(release.steam_url || release.nintendo_url) && (
                    <a
                      href={withGamerClockUtm(release.steam_url || release.nintendo_url, 'admin_release_source')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block truncate text-xs text-indigo-300 hover:text-indigo-200"
                    >
                      Source
                    </a>
                  )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs">
                    Featured
                    <Switch
                      checked={release.is_featured}
                      onCheckedChange={(v) => updateRelease(release.id, { is_featured: v })}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    Published
                    <Switch
                      checked={release.is_published !== false}
                      onCheckedChange={(v) => updateRelease(release.id, { is_published: v })}
                    />
                  </label>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Hero color
                  <input
                    type="color"
                    value={release.hero_color ?? '#1b2838'}
                    onChange={(e) =>
                      setReleases((prev) =>
                        prev.map((r) =>
                          r.id === release.id ? { ...r, hero_color: e.target.value } : r
                        )
                      )
                    }
                    className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
                  />
                  <Input
                    value={release.hero_color ?? '#1b2838'}
                    onChange={(e) =>
                      setReleases((prev) =>
                        prev.map((r) =>
                          r.id === release.id ? { ...r, hero_color: e.target.value } : r
                        )
                      )
                    }
                    className="h-8 w-24 border-zinc-700 bg-zinc-900 font-mono text-xs"
                  />
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateRelease(release.id, { hero_color: release.hero_color ?? '#1b2838' })
                  }
                >
                  Save color
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
