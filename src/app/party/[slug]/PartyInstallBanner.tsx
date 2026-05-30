'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { trackPartyReferralInstallClick, trackPartyReferralVisit } from '@/lib/posthog'

interface PartyInstallBannerProps {
  gameName: string
  hostName?: string
  sourceSlug: string
}

export function PartyInstallBanner({ gameName, hostName, sourceSlug }: PartyInstallBannerProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('gamecal-party-install-dismissed')
    const visited = localStorage.getItem('gamecal-visited')
    if (!dismissed && !visited) {
      setShow(true)
      trackPartyReferralVisit({ source_slug: sourceSlug, game: gameName })
    }
    localStorage.setItem('gamecal-visited', 'true')
  }, [gameName, sourceSlug])

  if (!show) return null

  const dismiss = () => {
    localStorage.setItem('gamecal-party-install-dismissed', 'true')
    setShow(false)
  }

  return (
    <section
      data-testid="party-install-banner"
      className="mt-6 rounded-2xl border border-indigo-500/30 bg-indigo-950/25 p-4 shadow-[0_0_40px_rgba(99,102,241,0.12)]"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-indigo-500/15 p-2 text-2xl">🎮</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-indigo-200">
            {hostName ? `${hostName} is using GamerClock` : 'Track your gaming schedule for free'}
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Never miss a {gameName} event. Follow resets, releases, rewards, and squad plans in one calendar.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/?ref=party_link&party=${encodeURIComponent(sourceSlug)}`}
              onClick={() => trackPartyReferralInstallClick({ source_slug: sourceSlug, game: gameName })}
              className="rounded-md bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-400"
            >
              Try GamerClock Free →
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-md px-3 py-2 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
