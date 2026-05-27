'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { adminFetch } from '@/lib/admin-fetch'
import { toast } from 'sonner'

const CRAWLERS = [
  { slug: 'fortnite', label: 'Fortnite' },
  { slug: 'wow', label: 'World of Warcraft' },
  { slug: 'lol', label: 'League of Legends' },
  { slug: 'genshin', label: 'Genshin Impact' },
  { slug: 'pokemon-go', label: 'Pokémon GO' },
]

export default function AdminPage() {
  const [crawling, setCrawling] = useState<string | null>(null)

  const triggerCrawl = async (slug: string) => {
    setCrawling(slug)
    try {
      const res = await adminFetch(`/api/admin/crawl/${slug}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${slug} crawl complete`, { description: JSON.stringify(data).slice(0, 80) })
      } else {
        toast.error(data.error ?? 'Crawl failed')
      }
    } catch {
      toast.error('Crawl request failed')
    } finally {
      setCrawling(null)
    }
  }

  return (
    <main data-testid="admin-landing" className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">GamerClock Admin</h1>
        <p className="text-muted-foreground">
          Manage events, releases, and trigger crawlers.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-zinc-900">
          <CardHeader>
            <CardTitle>Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              View all events, filter by date, toggle publish status.
            </p>
            <Button data-testid="open-events-admin" asChild>
              <Link href="/admin/events">Manage Events →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900">
          <CardHeader>
            <CardTitle>New Releases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Edit hero colors, featured status, and publish state.
            </p>
            <Button data-testid="open-releases-admin" asChild>
              <Link href="/admin/releases">Manage Releases →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900">
        <CardHeader>
          <CardTitle>Crawler Triggers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Manually run game crawlers to refresh event data.
          </p>
          <div className="flex flex-wrap gap-2">
            {CRAWLERS.map(({ slug, label }) => (
              <Button
                key={slug}
                variant="outline"
                size="sm"
                data-testid={`crawl-${slug}`}
                disabled={crawling === slug}
                onClick={() => triggerCrawl(slug)}
              >
                {crawling === slug ? 'Running…' : label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900">
        <CardHeader>
          <CardTitle>Legacy Console</CardTitle>
        </CardHeader>
        <CardContent>
          <Button data-testid="open-admin-console" variant="outline" asChild>
            <Link href="/admin/console.html" target="_blank">
              Open Standalone Console →
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
