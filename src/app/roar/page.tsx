import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays, Gamepad2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function RoarPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#06130d] text-white">
      <section className="relative flex min-h-screen items-center px-6 py-10">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'linear-gradient(90deg, rgba(4,18,12,0.98) 0%, rgba(4,18,12,0.82) 48%, rgba(4,18,12,0.36) 100%), url(/world-cup-crowd-board.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/60 to-transparent" />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_420px]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.25em] text-emerald-200/80">
              GamerClock
            </Link>
            <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-emerald-100">
              <Trophy className="h-4 w-4" />
              World Cup Crowd Battle
            </div>
            <h1 className="mt-5 font-rajdhani text-5xl font-black leading-none tracking-tight md:text-7xl">
              ROAR is coming to GamerClock
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50/72">
              Pick a side, fill the crowd, cheer during live fixtures, and turn every World Cup match
              into a playable calendar moment.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-emerald-400 text-emerald-950 hover:bg-emerald-300">
                <Link href="/">
                  <CalendarDays className="mr-2 h-5 w-5" />
                  Open World Cup Calendar
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-black/30 text-white hover:bg-white/10">
                <a href="/api/world-cup/matches" target="_blank" rel="noopener noreferrer">
                  View Match API
                </a>
              </Button>
            </div>
          </div>

          <div className="relative hidden min-h-[520px] lg:block">
            <Image
              src="/roar-mascot.png"
              alt="ROAR mascot"
              width={620}
              height={620}
              priority
              className="absolute bottom-0 right-0 w-[520px] max-w-none drop-shadow-[0_30px_80px_rgba(34,197,94,0.35)]"
            />
            <div className="absolute right-5 top-10 rounded-2xl border border-white/15 bg-black/35 p-4 backdrop-blur">
              <Image src="/roar-logo-lockup.png" alt="ROAR" width={220} height={120} />
              <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-100/80">
                <Gamepad2 className="h-4 w-4" />
                Mini-game integration in progress
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
