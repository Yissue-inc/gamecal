export type MiniGameManifest = {
  slug: string
  title: string
  description: string
  version: string
  entry: string
  thumbnail: string
  orientation: 'portrait' | 'landscape' | 'responsive'
  input: Array<'tap' | 'keyboard' | 'pointer'>
  supportsGuest: boolean
  requiresAuthFor: Array<'save_score' | 'claim_reward'>
  score: {
    primaryMetric: string
    higherIsBetter: boolean
    unit: string
  }
  calendar: {
    allowedGameSlugs: string[]
    eventScoped: boolean
  }
  analyticsPrefix: string
}

export const MINI_GAMES: MiniGameManifest[] = [
  {
    slug: 'wave-village-fishing',
    title: 'Wave Village Fishing Log',
    description: 'A pixel-art fishing trip with an aquarium to fill and care for.',
    version: '1.0.0',
    entry: '/mini-games/wave-village-fishing/index.html',
    thumbnail: '/mini-games/wave-village-fishing/assets/backgrounds/harbor-day.png',
    orientation: 'responsive',
    input: ['tap', 'keyboard', 'pointer'],
    supportsGuest: true,
    requiresAuthFor: ['save_score', 'claim_reward'],
    score: {
      primaryMetric: 'fish_score',
      higherIsBetter: true,
      unit: 'pts',
    },
    calendar: {
      allowedGameSlugs: [],
      eventScoped: false,
    },
    analyticsPrefix: 'minigame_wave_village_fishing',
  },
]

export function getMiniGameBySlug(slug: string) {
  return MINI_GAMES.find((game) => game.slug === slug)
}
