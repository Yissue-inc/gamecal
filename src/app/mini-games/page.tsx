import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Gamepad2,
  Sparkles,
  Waves,
} from 'lucide-react'
import { MINI_GAMES } from '@/lib/minigames'

export const metadata: Metadata = {
  title: 'Mini Games | GamerClock',
  description: 'Play GamerClock’s growing collection of hand-crafted browser mini games.',
  alternates: { canonical: '/mini-games' },
  openGraph: {
    title: 'Mini Games | GamerClock',
    description: 'A growing library of hand-crafted browser adventures from GamerClock.',
    url: '/mini-games',
  },
}

const gameCardDetails = {
  'wave-village-fishing': {
    eyebrow: 'COZY COLLECTION ADVENTURE',
    image: '/mini-games/assets/wave-village-fishing-card-v1.webp',
    imageAlt: 'Key art showing a fisher on a harbor pier above a glowing legendary fish',
    badge: 'NEW',
    accent: 'from-cyan-300 via-sky-400 to-blue-600',
    label: 'Play fishing adventure',
    order: 1,
  },
  'light-warrior': {
    eyebrow: 'GENTLE QUEST',
    image: '/mini-games/assets/warrior-of-light-card-v1.webp',
    imageAlt: 'Key art showing a lantern-carrying adventurer in a golden village garden',
    badge: 'STORY MODE',
    accent: 'from-amber-200 via-orange-400 to-rose-500',
    label: 'Play Warrior of Light',
    order: 2,
  },
  'jonah-journey': {
    eyebrow: 'SEA STORY ADVENTURE',
    image: '/mini-games/assets/jonah-returning-journey-card-v1.webp',
    imageAlt: 'Key art showing a small sailboat beside a giant moonlit fish',
    badge: 'STORY MODE',
    accent: 'from-violet-300 via-indigo-500 to-cyan-500',
    label: 'Play Jonah’s Returning Journey',
    order: 3,
  },
  'pilgrims-path': {
    eyebrow: 'CHOICE-DRIVEN JOURNEY',
    image: '/mini-games/assets/pilgrims-path-card-v1.webp',
    imageAlt: 'Key art from The Pilgrim’s Path, showing the Cross in a cinematic pixel-art scene',
    badge: 'NEW STORY',
    accent: 'from-emerald-200 via-teal-400 to-sky-600',
    label: 'Play The Pilgrim’s Path',
    order: 4,
  },
} as const

const games = MINI_GAMES
  .map((game) => ({ ...game, card: gameCardDetails[game.slug as keyof typeof gameCardDetails] }))
  .filter((game): game is typeof game & { card: (typeof gameCardDetails)[keyof typeof gameCardDetails] } => Boolean(game.card))
  .sort((a, b) => a.card.order - b.card.order)

export default function MiniGamesPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050a17] text-white">
      <section className="relative isolate overflow-hidden border-b border-white/10">
        <Image
          src="/mini-games/assets/mini-games-hero-v1.png"
          alt="A night-time pixel-art world of fishing, sea voyages, and magical adventure"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-center opacity-75"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,10,23,.97)_0%,rgba(5,10,23,.78)_42%,rgba(5,10,23,.38)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_38%_15%,rgba(65,219,255,.24),transparent_28%),linear-gradient(180deg,transparent_40%,#050a17_100%)]" />

        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link href="/" className="group inline-flex items-center gap-3 font-black tracking-tight" aria-label="Back to GamerClock">
            <span className="grid size-10 place-items-center rounded-xl border border-cyan-200/30 bg-cyan-300/10 text-cyan-100 shadow-[0_0_32px_rgba(34,211,238,.22)] transition group-hover:scale-105">
              <Clock3 className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg sm:text-xl">GamerClock</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/45 px-4 py-2 text-sm font-bold text-slate-100 backdrop-blur transition hover:border-cyan-200/50 hover:bg-slate-950/70"
          >
            <CalendarDays className="size-4 text-cyan-200" aria-hidden="true" />
            Event Calendar
          </Link>
        </header>

        <div className="mx-auto grid min-h-[560px] max-w-7xl content-center gap-10 px-5 pb-24 pt-10 sm:px-8 lg:grid-cols-[minmax(0,760px)_1fr] lg:px-10">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-200/10 px-4 py-2 text-xs font-black tracking-[0.18em] text-amber-100">
              <Sparkles className="size-3.5" aria-hidden="true" />
              GAMERCLOCK ARCADE
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[.95] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
              Small games.<br />
              <span className="bg-gradient-to-r from-cyan-200 via-sky-300 to-amber-200 bg-clip-text text-transparent">Big adventures.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base font-medium leading-7 text-slate-200 sm:text-lg">
              Play a growing collection of handcrafted browser adventures. Pick a world, jump in, and come back whenever you need a little quest.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#game-library"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_9px_0_#0c7286,0_0_38px_rgba(34,211,238,.3)] transition hover:-translate-y-0.5 hover:bg-cyan-200 active:translate-y-1 active:shadow-none"
              >
                Explore the library <ArrowRight className="size-4" aria-hidden="true" />
              </a>
              <span className="inline-flex items-center gap-2 px-2 text-sm font-semibold text-slate-300">
                <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_16px_#6ee7b7]" />
                {games.length} games available now
              </span>
            </div>
          </div>

          <aside className="self-end rounded-3xl border border-white/15 bg-slate-950/45 p-5 shadow-2xl backdrop-blur-md lg:mb-1">
            <p className="text-xs font-black tracking-[0.18em] text-cyan-200">THE LIBRARY KEEPS GROWING</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {['PLAY', 'SAVE', 'RETURN'].map((word, index) => (
                <div key={word} className="rounded-2xl border border-white/10 bg-white/[.06] p-3">
                  <span className="text-xs font-black text-amber-200">0{index + 1}</span>
                  <p className="mt-5 text-xs font-bold tracking-wide text-slate-100">{word}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">New worlds will join this shelf as GamerClock&apos;s mini-game portfolio grows.</p>
          </aside>
        </div>
      </section>

      <section id="game-library" className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(46,206,230,.13),transparent_62%)]" />
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-cyan-300">PLAYABLE WORLDS</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Choose your next adventure.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-slate-400">Every title is made to open instantly in your browser with tap, pointer, and keyboard-friendly controls.</p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {games.map((game, index) => (
            <article key={game.title} className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-[#10192b] shadow-[0_22px_70px_rgba(0,0,0,.3)] transition duration-300 hover:-translate-y-1 hover:border-cyan-200/40 hover:shadow-[0_30px_88px_rgba(4,218,255,.14)]">
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image src={game.card.image} alt={game.card.imageAlt} fill sizes="(max-width: 1024px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-110" />
                <div className={`absolute inset-0 bg-gradient-to-t ${game.card.accent} opacity-55 mix-blend-overlay`} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071021] via-transparent to-transparent" />
                <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-slate-950/65 px-3 py-1.5 text-[10px] font-black tracking-[0.16em] text-white backdrop-blur">{game.card.badge}</span>
                <span className="absolute bottom-4 left-4 text-4xl font-black tracking-tighter text-white/90">0{index + 1}</span>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-[10px] font-black tracking-[0.17em] text-cyan-300">{game.card.eyebrow}</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-white">{game.title}</h3>
                <p className="mt-3 min-h-14 text-sm leading-6 text-slate-300">{game.description}</p>
                <Link href={`/play/${game.slug}?source=arcade`} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.07] px-4 py-3 text-sm font-black text-white transition hover:border-cyan-200/70 hover:bg-cyan-200 hover:text-slate-950">
                  <Gamepad2 className="size-4" aria-hidden="true" />
                  {game.card.label}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#081326]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 px-5 py-12 sm:flex-row sm:items-center sm:px-8 lg:px-10">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200"><Waves className="size-5" aria-hidden="true" /></span>
            <div>
              <h2 className="text-xl font-black">Made for a quick, joyful break.</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">No install required. Open a game and start exploring.</p>
            </div>
          </div>
          <a href="#game-library" className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200">Play a game <ArrowRight className="size-4" aria-hidden="true" /></a>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-7 text-xs font-semibold text-slate-500 sm:px-8 lg:px-10">
        <span>© {new Date().getFullYear()} GamerClock Arcade</span>
        <Link href="/" className="transition hover:text-cyan-200">Back to GamerClock Calendar</Link>
      </footer>
    </main>
  )
}
