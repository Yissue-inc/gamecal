'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getDaysUntil } from '@/lib/utils'
import type { NewRelease } from '@/types'

export default function NewReleasesPage() {
  const [featured, setFeatured] = useState<NewRelease[]>([])
  const [all, setAll] = useState<NewRelease[]>([])

  useEffect(() => {
    fetch('/api/new-releases?featured=true')
      .then((r) => r.json())
      .then((d) => setFeatured(d.releases ?? []))
    fetch('/api/new-releases')
      .then((r) => r.json())
      .then((d) => setAll(d.releases ?? []))
  }, [])

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="text-xl font-bold">
          GAME<span className="text-primary">CAL</span>
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">New Releases</h1>
        <p className="text-sm text-muted-foreground">Upcoming Switch & Steam titles</p>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-12">
        {featured.length > 0 && (
          <section>
            <h2 className="mb-6 text-lg font-semibold text-primary">Featured</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {featured.map((release) => (
                <ReleaseCard key={release.id} release={release} featured />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-6 text-lg font-semibold">All Upcoming</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {all.map((release) => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function ReleaseCard({ release, featured = false }: { release: NewRelease; featured?: boolean }) {
  const days = getDaysUntil(release.release_date)
  const dday = days === 0 ? 'D-Day' : days > 0 ? `D-${days}` : `D+${Math.abs(days)}`

  return (
    <Card className={featured ? 'border-primary/30 bg-zinc-900' : 'bg-zinc-900/50'}>
      <CardHeader>
        <div className="flex flex-wrap gap-1">
          {release.platform.map((p) => (
            <Badge key={p} variant="secondary">{p}</Badge>
          ))}
        </div>
        <CardTitle className={featured ? 'text-xl' : 'text-lg'}>{release.title}</CardTitle>
        {release.developer && (
          <p className="text-sm text-muted-foreground">{release.developer}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span>{release.release_date}</span>
          <Badge variant="outline">{dday}</Badge>
        </div>
        {release.description && (
          <p className="text-sm text-zinc-400">{release.description}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {release.steam_url && (
            <Button size="sm" variant="outline" asChild>
              <a href={release.steam_url} target="_blank" rel="noopener noreferrer">Steam</a>
            </Button>
          )}
          {release.nintendo_url && (
            <Button size="sm" variant="outline" asChild>
              <a href={release.nintendo_url} target="_blank" rel="noopener noreferrer">Nintendo</a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
