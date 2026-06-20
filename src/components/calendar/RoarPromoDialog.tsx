'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Gamepad2, Medal, Trophy } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { trackEvent } from '@/lib/posthog'
import { isWorldCupThemeActive, WORLD_CUP_SLUG } from '@/lib/world-cup-config'
import type { GameEvent } from '@/types'

const DISMISS_KEY = 'gamerclock-roar-promo-dismissed-v1'

function nextSummerCupMatch(events: GameEvent[]) {
  const now = Date.now()
  return events
    .filter((event) => event.game?.slug === WORLD_CUP_SLUG)
    .filter((event) => new Date(event.end_at ?? event.start_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0] ?? null
}

function matchLabel(event: GameEvent | null) {
  if (!event) return 'Summer Cup live arena'
  const group = typeof event.metadata?.group === 'string' ? event.metadata.group : 'Summer Cup'
  return `${group} · ${event.title}`
}

export function RoarPromoDialog({ events }: { events: GameEvent[] }) {
  const [open, setOpen] = useState(false)
  const nextMatch = useMemo(() => nextSummerCupMatch(events), [events])
  const roarHref = nextMatch
    ? `/roar?match=${encodeURIComponent(nextMatch.id)}&source=roar_promo_popup`
    : '/roar?source=roar_promo_popup'

  useEffect(() => {
    if (!isWorldCupThemeActive()) return
    if (!events.some((event) => event.game?.slug === WORLD_CUP_SLUG)) return

    const params = new URLSearchParams(window.location.search)
    const forced = params.get('roar_promo') === '1' || params.get('promo') === 'roar'
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === '1'
    if (dismissed && !forced) return

    const timer = window.setTimeout(() => {
      setOpen(true)
      trackEvent('roar_promo_viewed', {
        forced,
        match_id: nextMatch?.id,
        match_title: nextMatch?.title,
      })
    }, forced ? 150 : 900)

    return () => window.clearTimeout(timer)
  }, [events, nextMatch?.id, nextMatch?.title])

  const close = (action: 'dismiss' | 'play' | 'calendar') => {
    window.localStorage.setItem(DISMISS_KEY, '1')
    setOpen(false)
    window.dispatchEvent(new CustomEvent('gamerclock:roar-promo-state', { detail: { open: false } }))
    trackEvent('roar_promo_action', {
      action,
      match_id: nextMatch?.id,
      match_title: nextMatch?.title,
    })
  }

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('gamerclock:roar-promo-state', { detail: { open } }))
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : close('dismiss'))}>
      <DialogContent
        data-testid="roar-promo-dialog"
        className="max-h-[92vh] max-w-[960px] overflow-y-auto overflow-x-hidden border-emerald-300/25 bg-[#06130d] p-0 text-white shadow-[0_40px_160px_rgba(0,0,0,.7)] sm:rounded-xl"
      >
        <div className="grid md:min-h-[min(720px,92vh)] md:grid-cols-[1.18fr_.82fr]">
          <div className="relative min-h-[240px] overflow-hidden bg-black sm:min-h-[285px] md:min-h-full">
            <Image
              src="/mini-cup/assets/promo/keyvisual-16x9.webp"
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 58vw"
              className="hidden object-cover md:block"
              priority
            />
            <Image
              src="/mini-cup/assets/promo/hero-9x16-mobile.webp"
              alt=""
              fill
              sizes="100vw"
              className="object-cover md:hidden"
              priority
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,8,.08),rgba(3,10,8,.62)),linear-gradient(90deg,rgba(3,10,8,.35),transparent_48%)]" />
            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100 backdrop-blur">
              <Trophy className="h-3.5 w-3.5 text-amber-200" />
              Summer Cup Mode
            </div>
            <div className="absolute inset-x-0 bottom-0 p-5">
              <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/25 bg-black/45 px-3 py-2 text-sm font-bold text-emerald-50 backdrop-blur">
                <Gamepad2 className="h-4 w-4 text-emerald-300" />
                {matchLabel(nextMatch)}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col justify-center gap-3 bg-[radial-gradient(circle_at_top_right,rgba(246,197,0,.18),transparent_34%),linear-gradient(180deg,#07180f,#050908)] p-5 sm:gap-5 sm:p-8">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">
                <Medal className="h-4 w-4" />
                ROAR is live
              </div>
              <DialogTitle className="font-rajdhani text-[2.18rem] font-black leading-[0.95] tracking-tight text-white sm:text-5xl">
                Cheer the match. Own the crowd.
              </DialogTitle>
              <DialogDescription className="mt-3 text-[15px] leading-6 text-emerald-50/72 sm:mt-4 sm:text-base sm:leading-7">
                Pick a side, tap and shake to fill the stadium, climb the ROAR rank, and return to GamerClock for the next Summer Cup fixture.
              </DialogDescription>
            </div>

            <div className="grid gap-2 text-[13px] text-white/78 sm:text-sm">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">Live match context from the calendar</div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">Nation cheer totals and ranks</div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">Sign in to save progress and history</div>
            </div>

            <div className="grid grid-cols-2 gap-2 pb-1 sm:pb-0">
              <Button asChild className="h-11 bg-emerald-400 text-sm font-black text-emerald-950 hover:bg-emerald-300 sm:h-12 sm:text-base">
                <Link href={roarHref} onClick={() => close('play')}>
                  <Gamepad2 className="mr-2 h-5 w-5" />
                  Play ROAR
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 border-white/20 bg-black/20 text-sm font-bold text-white hover:bg-white/10 sm:h-12 sm:text-base">
                <Link href="/?game=world-cup" onClick={() => close('calendar')}>
                  <CalendarDays className="mr-2 h-5 w-5" />
                  View Calendar
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
