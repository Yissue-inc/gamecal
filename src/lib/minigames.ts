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
  launchParams?: Record<string, string>
}

export const MINI_GAMES: MiniGameManifest[] = [
  {
    slug: 'pilgrims-path',
    title: 'The Pilgrim’s Path',
    description: 'A playable Pilgrim’s Progress: carry the burden, lose it at the Cross, and cross the last river.',
    version: '1.6.0',
    entry: '/mini-games/pilgrims-path/index.html',
    thumbnail: '/mini-games/assets/pilgrims-path-card-v1.webp',
    orientation: 'responsive',
    input: ['tap', 'keyboard', 'pointer'],
    supportsGuest: true,
    requiresAuthFor: ['save_score', 'claim_reward'],
    score: { primaryMetric: 'journey_progress', higherIsBetter: true, unit: 'chapters' },
    calendar: { allowedGameSlugs: [], eventScoped: false },
    analyticsPrefix: 'minigame_pilgrims_path',
  },
  {
    slug: 'light-warrior',
    title: 'Warrior of Light',
    description: 'A playable gospel journey: gather, build, meet Jesus, and cross the bridge of light.',
    version: '1.0.7',
    entry: '/mini-games/light-warrior/index.html',
    thumbnail: '/mini-games/_bible-shared/assets/pixel-gospel/family-garden.webp',
    orientation: 'portrait',
    input: ['tap', 'keyboard', 'pointer'],
    supportsGuest: true,
    requiresAuthFor: ['save_score', 'claim_reward'],
    score: { primaryMetric: 'journey_progress', higherIsBetter: true, unit: 'chapters' },
    calendar: { allowedGameSlugs: [], eventScoped: false },
    analyticsPrefix: 'minigame_light_warrior',
    launchParams: { pixel: '1' },
  },
  {
    slug: 'jonah-journey',
    title: 'Jonah’s Returning Journey',
    description: 'Walk with Jonah from the harbor and storm into the giant fish and back toward God.',
    version: '1.0.7',
    entry: '/mini-games/jonah-journey/index.html',
    thumbnail: '/mini-games/_bible-shared/assets/jonah/fish-cinematic-v1.png',
    orientation: 'portrait',
    input: ['tap', 'keyboard', 'pointer'],
    supportsGuest: true,
    requiresAuthFor: ['save_score', 'claim_reward'],
    score: { primaryMetric: 'journey_progress', higherIsBetter: true, unit: 'chapters' },
    calendar: { allowedGameSlugs: [], eventScoped: false },
    analyticsPrefix: 'minigame_jonah_journey',
    launchParams: { jonah: '1' },
  },
  {
    slug: 'wave-village-fishing',
    title: 'Wave Village Fishing Log',
    description: 'A pixel-art fishing trip with an aquarium to fill and care for.',
    version: '2.0.0',
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
  {
    slug: 'world-sprint-circuit',
    title: 'World Sprint Circuit',
    description: 'Coach a track club: train athletes, manage condition and injuries, then watch the meets play out.',
    version: '1.0.0',
    entry: '/mini-games/world-sprint-circuit/index.html',
    thumbnail: '/mini-games/assets/world-sprint-circuit-card-v1.webp',
    orientation: 'landscape',
    input: ['tap', 'keyboard', 'pointer'],
    supportsGuest: true,
    requiresAuthFor: ['save_score'],
    score: {
      primaryMetric: 'circuit_score',
      higherIsBetter: true,
      unit: 'pts',
    },
    calendar: {
      allowedGameSlugs: [],
      eventScoped: false,
    },
    analyticsPrefix: 'minigame_world_sprint_circuit',
  },
]

export function getMiniGameBySlug(slug: string) {
  return MINI_GAMES.find((game) => game.slug === slug)
}

/* ============================================================
   서버 헬퍼 — 세션/점수 API 가 공유한다.
   ROAR 패턴을 따르되 ROAR 테이블·용어는 쓰지 않는다.
   ============================================================ */

export type MiniGameIdentity = {
  userId: string | null
  deviceId: string | null
  identityType: 'user' | 'device'
}

/** 이벤트가 없는 게임도 유일 제약이 걸리도록 스코프 키를 만든다 (핸드오프 §10) */
export const MINI_GAME_GLOBAL_SCOPE = 'global'

export function miniGameScopeKey(eventId: string | null | undefined) {
  const cleaned = cleanMiniGameText(eventId)
  return cleaned || MINI_GAME_GLOBAL_SCOPE
}

export function cleanMiniGameText(value: unknown, fallback = ''): string {
  const text = typeof value === 'string' ? value : fallback
  return text.trim().slice(0, 180)
}

export function cleanMiniGameNumber(value: unknown, fallback = 0): number {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(0, Math.floor(number))
}

/** 아이프레임이 보낸 stats 는 신뢰하지 않는다 — 얕은 스칼라만 통과시킨다 */
export function cleanMiniGameStats(value: unknown): Record<string, number | string | boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, number | string | boolean> = {}
  let count = 0
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (count >= 24) break
    const safeKey = key.trim().slice(0, 40)
    if (!safeKey) continue
    if (typeof raw === 'number' && Number.isFinite(raw)) out[safeKey] = raw
    else if (typeof raw === 'boolean') out[safeKey] = raw
    else if (typeof raw === 'string') out[safeKey] = raw.slice(0, 120)
    else continue
    count += 1
  }
  return out
}

export function getMiniGameIdentity(
  userId: string | null | undefined,
  deviceId: unknown,
): MiniGameIdentity | null {
  const cleanedDeviceId = cleanMiniGameText(deviceId).slice(0, 120) || null
  if (userId) return { userId, deviceId: cleanedDeviceId, identityType: 'user' }
  if (!cleanedDeviceId) return null
  return { userId: null, deviceId: cleanedDeviceId, identityType: 'device' }
}

/** 마이그레이션 전에도 500 을 내지 않도록 — 스키마가 없으면 조용히 비활성 */
export function isMiniGameSchemaMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const message = 'message' in error && typeof error.message === 'string' ? error.message : ''
  const code = 'code' in error && typeof error.code === 'string' ? error.code : ''
  return code === 'PGRST205' || code === '42P01' || message.includes('Could not find the table')
}

/** 점수는 서버가 매니페스트 범위 안으로 자른다 (아이프레임 값을 믿지 않는다) */
export function clampMiniGameScore(slug: string, rawScore: unknown): number {
  const score = cleanMiniGameNumber(rawScore, 0)
  const game = getMiniGameBySlug(slug)
  if (!game) return 0
  const ceiling = game.score.primaryMetric === 'journey_progress' ? 64 : 5_000_000
  return Math.min(score, ceiling)
}
