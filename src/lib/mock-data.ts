import type { Game, GameEvent } from '@/types'

export const MOCK_GAMES: Game[] = [
  { id: '1', slug: 'fortnite',   name: 'Fortnite',           brand_color: '#00d4ff', platform: ['PC','PS5','Xbox','Mobile','Switch'], sort_order: 1 },
  { id: '2', slug: 'apex',       name: 'Apex Legends',        brand_color: '#e33c3c', platform: ['PC','PS5','Xbox'],                   sort_order: 2 },
  { id: '3', slug: 'valorant',   name: 'Valorant',            brand_color: '#ff4655', platform: ['PC'],                                sort_order: 3 },
  { id: '4', slug: 'lol',        name: 'League of Legends',   brand_color: '#c89b3c', platform: ['PC'],                                sort_order: 4 },
  { id: '5', slug: 'destiny2',   name: 'Destiny 2',           brand_color: '#4f91cd', platform: ['PC','PS5','Xbox'],                   sort_order: 5 },
  { id: '6', slug: 'diablo4',    name: 'Diablo IV',           brand_color: '#b45309', platform: ['PC','PS5','Xbox'],                   sort_order: 6 },
  { id: '7', slug: 'wow',        name: 'World of Warcraft',   brand_color: '#f59e0b', platform: ['PC'],                                sort_order: 7 },
  { id: '8', slug: 'pokemon-go', name: 'Pokémon GO',          brand_color: '#eab308', platform: ['Mobile'],                            sort_order: 8 },
  { id: '9', slug: 'genshin',    name: 'Genshin Impact',      brand_color: '#4ade80', platform: ['PC','PS5','Mobile'],                 sort_order: 9 },
]

function evt(
  id: string,
  gameId: string,
  game: Game,
  title: string,
  event_type: GameEvent['event_type'],
  importance: GameEvent['importance'],
  start_at: string,
  end_at?: string,
  description?: string
): GameEvent {
  return {
    id,
    game_id: gameId,
    game,
    title,
    description,
    event_type,
    importance,
    start_at,
    end_at,
    is_recurring: false,
    source_url: `https://gamecal-beryl.vercel.app/${game.slug}`,
    is_published: true,
    created_at: new Date().toISOString(),
  }
}

function todayEvent(): GameEvent {
  const fn = MOCK_GAMES[0]
  const now = new Date()
  const start = new Date(now)
  start.setHours(14, 0, 0, 0)
  const end = new Date(now)
  end.setHours(20, 0, 0, 0)
  return evt(
    'e-today',
    fn.id,
    fn,
    'Today Event Demo',
    'limited_reward',
    'high',
    start.toISOString(),
    end.toISOString(),
    'Demo event for today — visible to guests'
  )
}

const [fn, wow, pogo, genshin, lol] = MOCK_GAMES

export const MOCK_EVENTS: GameEvent[] = [
  todayEvent(),
  evt('e1', fn.id, fn, 'Weekly Quests Reset', 'weekly_reset', 'high', '2026-05-28T09:00:00Z', '2026-06-04T08:59:00Z'),
  evt('e2', fn.id, fn, 'Summer Splash Event', 'live_event', 'high', '2026-06-20T00:00:00Z', '2026-07-10T23:59:00Z', 'Summer themed event with exclusive rewards'),
  evt('e3', fn.id, fn, 'Fortnite Season End', 'season_end', 'critical', '2026-06-13T02:00:00Z'),
  evt('e4', wow.id, wow, 'Weekly Reset', 'weekly_reset', 'high', '2026-05-26T15:00:00Z', '2026-06-02T14:59:00Z'),
  evt('e5', wow.id, wow, 'Midsummer Fire Festival', 'live_event', 'high', '2026-06-21T10:00:00Z', '2026-07-05T23:59:00Z', 'Annual summer festival'),
  evt('e6', wow.id, wow, 'WoW Patch 11.2 Release', 'patch_release', 'critical', '2026-06-09T15:00:00Z'),
  evt('e7', pogo.id, pogo, 'Community Day June', 'live_event', 'critical', '2026-06-21T14:00:00Z', '2026-06-21T17:00:00Z', 'Community Day event'),
  evt('e8', pogo.id, pogo, 'GO Fest 2026', 'live_event', 'critical', '2026-07-11T10:00:00Z', '2026-07-12T20:00:00Z'),
  evt('e9', genshin.id, genshin, 'Version 5.7 Update', 'new_content', 'critical', '2026-05-28T06:00:00Z'),
  evt('e10', genshin.id, genshin, 'Summer Event 2026', 'live_event', 'high', '2026-06-15T00:00:00Z', '2026-07-07T23:59:00Z'),
  evt('e11', lol.id, lol, 'Patch 16.11 — Balance Update', 'patch_release', 'high', '2026-05-27T14:00:00Z'),
  evt('e12', lol.id, lol, 'Night Market Opens', 'limited_reward', 'high', '2026-06-05T00:00:00Z', '2026-06-19T23:59:00Z', 'Exclusive skins available'),
  evt('e13', lol.id, lol, 'MSI 2026 — Finals', 'tournament', 'critical', '2026-06-20T12:00:00Z', '2026-06-20T18:00:00Z'),
]

export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
