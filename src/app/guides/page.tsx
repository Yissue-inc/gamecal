import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BookOpen, CalendarDays } from 'lucide-react'
import { GUIDES } from '@/lib/guides'
import { JsonLd } from '@/components/seo/JsonLd'
import { getAppUrl } from '@/lib/app-url'

export const metadata: Metadata = {
  title: 'Gaming Calendar Guides | GamerClock',
  description:
    'Guides for tracking game events, weekly resets, releases, Summer Cup 2026 fixtures, and ROAR participation on GamerClock.',
  alternates: { canonical: '/guides' },
  openGraph: {
    title: 'Gaming Calendar Guides | GamerClock',
    description:
      'Learn how to track game events, weekly resets, releases, and ROAR match participation with GamerClock.',
    url: '/guides',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gaming Calendar Guides | GamerClock',
    description:
      'Learn how to track game events, weekly resets, releases, and ROAR match participation with GamerClock.',
    images: ['/og-image.png'],
  },
}

export default function GuidesPage() {
  const appUrl = getAppUrl()

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': `${appUrl}/guides#collection`,
          name: 'Gaming Calendar Guides',
          url: `${appUrl}/guides`,
          isPartOf: { '@id': `${appUrl}/#website` },
          description:
            'Guides for tracking gaming events, weekly resets, releases, Summer Cup 2026 fixtures, and ROAR participation.',
        }}
      />
      <header className="border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-2 font-rajdhani text-xl font-bold">
          <Image src="/header-icon.png" alt="GamerClock" width={36} height={36} className="h-9 w-9" priority />
          Gamer<span className="text-primary">Clock</span>
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
            <BookOpen className="h-4 w-4" />
            Player planning guides
          </div>
          <h1 className="mt-5 font-rajdhani text-5xl font-black leading-none md:text-6xl">
            Gaming Calendar Guides
          </h1>
          <p className="mt-5 text-lg leading-8 text-zinc-300">
            Practical guides for tracking live game events, weekly resets, new releases, Summer Cup 2026
            fixtures, and ROAR participation.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="group rounded-lg border border-zinc-800 bg-zinc-950/70 p-5 transition hover:border-emerald-300/45 hover:bg-zinc-900"
            >
              <CalendarDays className="h-5 w-5 text-emerald-300" />
              <h2 className="mt-4 font-rajdhani text-2xl font-bold leading-tight text-white">
                {guide.shortTitle}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{guide.description}</p>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-200">
                Read guide
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
