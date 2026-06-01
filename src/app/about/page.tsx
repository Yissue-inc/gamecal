import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { BellRing, CalendarDays, Gamepad2, Radio, Sparkles, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'About GamerClock — Gaming Calendar for Live Events',
  description:
    'GamerClock helps players track game events, release dates, resets, tournaments, and reminders in one focused calendar.',
}

const principles = [
  {
    icon: CalendarDays,
    title: 'One calendar for every drop',
    text: 'Track live events, resets, patches, seasons, tournaments, and new releases without hopping between tabs.',
  },
  {
    icon: BellRing,
    title: 'Built around reminders',
    text: 'Wishlists, countdowns, and calendar feeds help players show up before the window closes.',
  },
  {
    icon: Trophy,
    title: 'Made for gaming rhythm',
    text: 'GamerClock understands that launches, dailies, limited-time modes, and esports nights all compete for attention.',
  },
]

const signals = ['Fortnite', 'World of Warcraft', 'Pokemon GO', 'Genshin Impact', 'League of Legends', 'New Releases']

export default function AboutPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0f0f0f] text-white">
      <section className="relative border-b border-zinc-800 bg-[linear-gradient(180deg,#141414_0%,#0f0f0f_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:36px_36px] opacity-40" />
        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-5 py-6 sm:px-8 lg:px-10">
          <nav className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 font-rajdhani text-xl font-bold">
              <Image src="/header-icon.png" alt="GamerClock" width={44} height={44} className="h-11 w-11" priority />
              <span>Gamer<span className="text-primary">Clock</span></span>
            </Link>
            <Button variant="outline" size="sm" className="border-zinc-700" asChild>
              <Link href="/">Open Calendar</Link>
            </Button>
          </nav>

          <div className="grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-200">
                <Radio className="h-3.5 w-3.5" />
                Gaming time, finally organized
              </div>
              <h1 className="font-rajdhani text-5xl font-bold leading-[0.95] sm:text-6xl lg:text-7xl">
                Gamer<span className="text-primary">Clock</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300 sm:text-xl">
                GamerClock is a focused calendar for players who do not want to miss the next reset, limited event,
                tournament, beta, season launch, or release day. It turns scattered game schedules into one clean,
                shareable timeline.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/">Track Events</Link>
                </Button>
                <Button variant="outline" size="lg" className="border-zinc-700" asChild>
                  <Link href="/new-releases">See Releases</Link>
                </Button>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[420px]">
              <div className="rounded-md border border-zinc-700 bg-[#191919] p-6 shadow-2xl shadow-black/40">
                <div className="flex items-center justify-center rounded-md border border-zinc-700 bg-[#101010] p-8">
                  <Image
                    src="/icon-512.png"
                    alt="GamerClock logo"
                    width={260}
                    height={260}
                    className="h-auto w-full max-w-[260px]"
                    priority
                  />
                </div>
                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-rajdhani text-2xl font-bold">GamerClock</p>
                    <p className="text-sm text-zinc-400">Live events, releases, reminders</p>
                  </div>
                  <Gamepad2 className="h-8 w-8 text-emerald-300" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 pb-2 sm:grid-cols-3">
            {principles.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="mt-3 font-rajdhani text-lg font-bold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{item.text}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-200">
            <Sparkles className="h-3.5 w-3.5" />
            Why it exists
          </div>
          <h2 className="mt-5 font-rajdhani text-4xl font-bold">Games move fast. Calendars should keep up.</h2>
        </div>
        <div className="space-y-5 text-base leading-8 text-zinc-300">
          <p>
            Most gaming schedules live across patch notes, Discord posts, store pages, esports calendars, and social
            updates. GamerClock brings those moments into a single place so players can plan sessions around what is
            actually happening.
          </p>
          <p>
            The goal is simple: make the next important gaming moment obvious at a glance, then make it easy to save,
            share, and return to.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {signals.map((signal) => (
              <span key={signal} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300">
                {signal}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
