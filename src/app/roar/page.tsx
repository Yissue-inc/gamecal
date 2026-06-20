import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { RoarArena } from '@/components/roar/RoarArena'

export const metadata: Metadata = {
  title: 'ROAR | Summer Cup 2026 Crowd Battle | GamerClock',
  description: 'Pick a Summer Cup side, fill the crowd, earn coins, and share your ROAR support proof from GamerClock.',
  openGraph: {
    title: 'ROAR | Summer Cup 2026 Crowd Battle',
    description: 'Turn Summer Cup 2026 calendar fixtures into a playable cheering battle.',
    images: ['/roar-logo-lockup.png'],
  },
}

export default function RoarPage({
  searchParams,
}: {
  searchParams?: { match?: string; matchId?: string; source?: string }
}) {
  const matchId = searchParams?.match ?? searchParams?.matchId

  return (
    <main data-theme="stadium" className="min-h-screen bg-[#06130d] text-white">
      <div className="fixed left-3 top-3 z-[80]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-100 shadow-lg backdrop-blur transition hover:bg-black/65"
        >
          <CalendarDays className="h-4 w-4" />
          Calendar
        </Link>
      </div>
      <RoarArena initialMatchId={matchId} source={searchParams?.source} />
    </main>
  )
}
