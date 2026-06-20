import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function EventPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 px-6 py-6">
        <Link href="/" className="font-rajdhani text-3xl font-bold tracking-tight">
          Gamer<span className="text-indigo-400">Clock</span>
        </Link>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-89px)] max-w-3xl items-center px-6 py-16">
        <Card className="w-full border-white/10 bg-white/[0.04] text-center shadow-2xl shadow-black/30">
          <CardContent className="flex flex-col items-center px-6 py-14 sm:px-10">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
              <CalendarDays className="h-8 w-8" aria-hidden="true" />
            </div>
            <h1 className="font-rajdhani text-4xl font-bold tracking-tight sm:text-5xl">
              No Active Promotion
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              GamerClock promotions are currently paused. Use the calendar to track live events,
              resets, release dates, and reminders.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/">Open Calendar</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
