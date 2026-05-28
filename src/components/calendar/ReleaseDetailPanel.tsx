'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { getDaysUntil, getReleaseHeroColor, withGamerClockUtm } from '@/lib/utils'
import type { NewRelease } from '@/types'

interface ReleaseDetailPanelProps {
  release: NewRelease | null
  isOpen: boolean
  onClose: () => void
}

function ReleaseContent({ release, onClose }: { release: NewRelease; onClose: () => void }) {
  const days = getDaysUntil(release.release_date)
  const dday = days === 0 ? 'D-Day' : days > 0 ? `D-${days}` : `D+${Math.abs(days)}`
  const heroColor = release.hero_color ?? getReleaseHeroColor(release.platform)

  return (
    <div className="flex h-full flex-col">
      <div
        data-testid="release-panel-hero"
        className="relative h-40 shrink-0 bg-cover bg-center"
        style={{
          backgroundImage: release.image_url
            ? `url(${release.image_url})`
            : `linear-gradient(135deg, ${heroColor} 0%, #1a1a2e 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
        <Button
          data-testid="close-release-panel"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 bg-black/40"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="absolute bottom-4 left-4 right-4">
          <Badge variant="outline" className="mb-2">{dday}</Badge>
          <h2 data-testid="release-panel-title" className="text-2xl font-bold">{release.title}</h2>
          {release.developer && (
            <p className="text-sm text-zinc-400">{release.developer}</p>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <div className="flex flex-wrap gap-1">
          {release.platform.map((p) => (
            <Badge key={p} variant="secondary">{p}</Badge>
          ))}
        </div>
        <p data-testid="release-panel-date" className="text-sm text-zinc-300">
          Releases {release.release_date}
        </p>
        {release.description && (
          <p className="text-sm leading-relaxed text-zinc-400">{release.description}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {release.steam_url && (
            <Button size="sm" variant="outline" asChild>
              <a
                href={withGamerClockUtm(release.steam_url, 'new_release_source')}
                data-testid="release-steam-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                Steam
              </a>
            </Button>
          )}
          {release.nintendo_url && (
            <Button size="sm" variant="outline" asChild>
              <a
                href={withGamerClockUtm(release.nintendo_url, 'new_release_source')}
                data-testid="release-nintendo-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                Nintendo
              </a>
            </Button>
          )}
        </div>
        <Button variant="outline" className="w-full border-zinc-700" asChild>
          <Link href="/new-releases" data-testid="view-all-releases-link">
            View all New Releases →
          </Link>
        </Button>
      </div>
    </div>
  )
}

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return isMobile
}

export function ReleaseDetailPanel({ release, isOpen, onClose }: ReleaseDetailPanelProps) {
  const isMobile = useIsMobileViewport()
  if (!release) return null

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="h-[85vh]" data-testid="release-panel">
          <ReleaseContent release={release} onClose={onClose} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      data-testid="release-panel"
      className={`fixed right-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-[380px] border-l border-zinc-800 bg-[#1a1a1a] transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <ReleaseContent release={release} onClose={onClose} />
    </div>
  )
}
