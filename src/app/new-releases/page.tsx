'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getDaysUntil, getReleaseHeroColor, withGamerClockUtm } from '@/lib/utils'
import type { NewRelease } from '@/types'

export default function NewReleasesPage() {
  const [all, setAll] = useState<NewRelease[]>([])

  useEffect(() => {
    fetch('/api/new-releases')
      .then((r) => r.json())
      .then((d) => setAll(d.releases ?? []))
  }, [])

  const featured = all.filter((release) => release.is_featured)
  const hero = featured[0] ?? all[0]

  return (
    <div className="min-h-screen bg-[#0f0f0f]" data-testid="new-releases-page">
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="font-rajdhani text-xl font-bold">
          Gamer<span className="text-primary">Clock</span>
        </Link>
        <h1 className="font-rajdhani mt-4 text-2xl font-semibold">New Releases</h1>
        <p data-testid="new-releases-subtitle" className="mt-1 text-sm text-zinc-400">
          PC · Console · Mobile — upcoming titles
        </p>
      </header>

      <main className="mx-auto max-w-6xl space-y-12 px-6 py-8">
        {hero && (
          <section data-testid="new-releases-hero">
            <HeroReleaseCard release={hero} />
          </section>
        )}

        {featured.length > 1 && (
          <section data-testid="featured-releases-section">
            <h2 className="font-rajdhani mb-6 text-lg font-semibold text-primary">Featured</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {featured.slice(1).map((release) => (
                <ReleaseCard key={release.id} release={release} featured />
              ))}
            </div>
          </section>
        )}

        <section data-testid="all-releases-section">
          <h2 className="font-rajdhani mb-6 text-lg font-semibold">All Upcoming</h2>
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

function HeroReleaseCard({ release }: { release: NewRelease }) {
  const days = getDaysUntil(release.release_date)
  const dday = days === 0 ? 'D-Day' : days > 0 ? `D-${days}` : `D+${Math.abs(days)}`
  const heroColor = release.hero_color ?? getReleaseHeroColor(release.platform)
  const hypeScore = Math.max(0, Math.min(100, release.hype_score ?? 0))

  return (
    <div
      data-testid="new-releases-hero-card"
      className="relative overflow-hidden rounded-xl border border-zinc-800"
      style={{
        backgroundImage: release.image_url
          ? `linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%), url(${release.image_url})`
          : `linear-gradient(135deg, ${heroColor} 0%, #0f0f0f 100%)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="flex min-h-[280px] flex-col justify-end p-8 md:min-h-[360px]">
        <Badge data-testid="hero-dday-badge" variant="outline" className="mb-3 w-fit border-yellow-500/50 text-yellow-400">
          {dday}
        </Badge>
        <h2 data-testid="hero-release-title" className="font-rajdhani max-w-2xl text-3xl font-bold md:text-5xl">
          {release.title}
        </h2>
        {release.developer && (
          <p className="mt-2 text-lg text-zinc-300">{release.developer}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {release.platform.map((p) => (
            <Badge key={p} variant="secondary">{p}</Badge>
          ))}
          {release.is_free_to_play && <Badge className="bg-emerald-600 text-white">Free to Play</Badge>}
        </div>
        {!!release.genre_tags?.length && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {release.genre_tags.slice(0, 5).map((tag) => (
              <span key={tag} className="rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-zinc-200">
                {tag}
              </span>
            ))}
          </div>
        )}
        {release.description && (
          <p className="mt-4 max-w-xl text-sm text-zinc-400">{release.description}</p>
        )}
        {hypeScore > 0 && (
          <div className="mt-4 max-w-sm">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-zinc-400">
              <span>Hype Score</span>
              <span className="text-amber-300">{hypeScore}/100</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300"
                style={{ width: `${hypeScore}%` }}
              />
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {release.preorder_url && (
            <Button data-testid="hero-preorder-btn" asChild>
              <a href={withGamerClockUtm(release.preorder_url, 'new_release_preorder')} target="_blank" rel="noopener noreferrer">
                Pre-order
              </a>
            </Button>
          )}
          {release.steam_url && (
            <Button data-testid="hero-steam-btn" asChild>
              <a
                href={withGamerClockUtm(release.steam_url, 'new_release_source')}
                target="_blank"
                rel="noopener noreferrer"
              >
                Wishlist on Steam
              </a>
            </Button>
          )}
          {release.trailer_url && (
            <Button variant="outline" asChild>
              <a href={withGamerClockUtm(release.trailer_url, 'new_release_trailer')} target="_blank" rel="noopener noreferrer">
                Watch Trailer
              </a>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/" data-testid="hero-calendar-btn">View Calendar</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function ReleaseCard({ release, featured = false }: { release: NewRelease; featured?: boolean }) {
  const days = getDaysUntil(release.release_date)
  const dday = days === 0 ? 'D-Day' : days > 0 ? `D-${days}` : `D+${Math.abs(days)}`
  const heroColor = release.hero_color ?? getReleaseHeroColor(release.platform)
  const hypeScore = Math.max(0, Math.min(100, release.hype_score ?? 0))

  return (
    <Card
      data-testid={`release-card-${release.id}`}
      className={`overflow-hidden ${featured ? 'border-primary/30 bg-zinc-900' : 'bg-zinc-900/50'}`}
    >
      <div
        data-testid="release-hero-placeholder"
        className="flex h-36 w-full items-end rounded-t-lg p-4"
        style={{
          background: release.image_url
            ? `linear-gradient(to top, rgba(0,0,0,0.8), transparent), url(${release.image_url}) center/cover`
            : `linear-gradient(135deg, ${heroColor} 0%, #1a1a2e 100%)`,
        }}
      >
        <span className="truncate text-3xl font-black leading-none text-white/20">
          {release.title}
        </span>
      </div>
      <CardHeader>
        <div className="flex flex-wrap gap-1">
          {release.platform.map((p) => (
            <Badge key={p} variant="secondary">{p}</Badge>
          ))}
          {release.is_free_to_play && <Badge className="bg-emerald-600 text-white">Free</Badge>}
        </div>
        {!!release.genre_tags?.length && (
          <div className="mt-2 flex flex-wrap gap-1">
            {release.genre_tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                {tag}
              </span>
            ))}
          </div>
        )}
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
        {hypeScore > 0 && (
          <div>
            <div className="mb-1 flex justify-between text-[10px] text-zinc-500">
              <span>Hype Score</span>
              <span className="font-bold text-amber-300">{hypeScore}/100</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300"
                style={{ width: `${hypeScore}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {release.preorder_url && (
            <Button size="sm" asChild>
              <a href={withGamerClockUtm(release.preorder_url, 'new_release_preorder')} target="_blank" rel="noopener noreferrer">
                Pre-order
              </a>
            </Button>
          )}
          {release.trailer_url && (
            <Button size="sm" variant="outline" asChild>
              <a href={withGamerClockUtm(release.trailer_url, 'new_release_trailer')} target="_blank" rel="noopener noreferrer">
                Trailer
              </a>
            </Button>
          )}
          {release.steam_url && (
            <Button size="sm" variant="outline" asChild>
              <a
                href={withGamerClockUtm(release.steam_url, 'new_release_source')}
                target="_blank"
                rel="noopener noreferrer"
              >
                Steam
              </a>
            </Button>
          )}
          {release.nintendo_url && (
            <Button size="sm" variant="outline" asChild>
              <a
                href={withGamerClockUtm(release.nintendo_url, 'new_release_source')}
                target="_blank"
                rel="noopener noreferrer"
              >
                Nintendo
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
