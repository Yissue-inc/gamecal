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
  }
}

export default function PlayMiniGamePage({ params, searchParams }: PlayPageProps) {
  const game = getMiniGameBySlug(params.miniGameSlug)
  if (!game) notFound()
  return <MiniGameShell game={game} eventId={searchParams.eventId} source={searchParams.source} />
}
