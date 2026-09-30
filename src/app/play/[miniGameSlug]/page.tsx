import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MiniGameShell } from '@/components/minigames/MiniGameShell'
import { getMiniGameBySlug } from '@/lib/minigames'

type PlayPageProps = {
  params: { miniGameSlug: string }
  searchParams: { eventId?: string; source?: string }
}

export function generateMetadata({ params }: PlayPageProps): Metadata {
  const game = getMiniGameBySlug(params.miniGameSlug)
  if (!game) return {}
  return {
    title: `${game.title} | GamerClock`,
    description: game.description,
    ...(game.slug === 'clean-keep'
      ? {
          openGraph: {
            title: game.title,
            description: game.description,
            images: [{ url: game.thumbnail, width: 1200, height: 630, alt: 'Clean & Keep key art' }],
          },
          twitter: { card: 'summary_large_image' as const, images: [game.thumbnail] },
        }
      : {}),
  }
}

export default function PlayMiniGamePage({ params, searchParams }: PlayPageProps) {
  const game = getMiniGameBySlug(params.miniGameSlug)
  if (!game) notFound()
  return <MiniGameShell game={game} eventId={searchParams.eventId} source={searchParams.source} />
}
