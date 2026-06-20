export type EventType =
  | 'weekly_reset'
  | 'season_start'
  | 'season_end'
  | 'live_event'
  | 'limited_reward'
  | 'patch_release'
  | 'tournament'
  | 'ranked_reset'
  | 'banner_end'
  | 'double_xp'
  | 'maintenance'
  | 'new_content'
  | 'other'

export type Importance = 'critical' | 'high' | 'normal' | 'low'
export type RewardType =
  | 'skin'
  | 'currency'
  | 'xp_boost'
  | 'item'
  | 'character'
  | 'banner'
  | 'raid_drop'
  | 'login_bonus'
  | 'tournament_prize'
  | 'progression'
  | 'content'
  | 'none'
export type RewardRarity = 'common' | 'limited' | 'premium' | 'time_limited'
export type SourceConfidence = 'official' | 'media' | 'inferred'

export interface Game {
  id: string
  slug: string
  name: string
  icon_url?: string
  brand_color: string
  platform: string[]
  sort_order: number
}

export interface GameEvent {
  id: string
  game_id: string
  game?: Game
  title: string
  description?: string
  event_type: EventType
  importance: Importance
  start_at: string
  end_at?: string
  is_recurring: boolean
  rrule?: string
  source_url?: string
  image_url?: string
  reward_type?: RewardType
  reward_summary?: string
  reward_rarity?: RewardRarity
  reward_score?: number
  is_time_limited_reward?: boolean
  source_confidence?: SourceConfidence
  metadata?: Record<string, unknown>
  is_published: boolean
  created_at: string
}

export interface NewRelease {
  id: string
  title: string
  developer?: string
  platform: string[]
  release_date: string
  description?: string
  image_url?: string
  hero_color?: string
  steam_url?: string
  nintendo_url?: string
  trailer_url?: string
  genre_tags?: string[]
  preorder_url?: string
  hype_score?: number
  is_free_to_play?: boolean
  is_featured: boolean
  is_published?: boolean
}

export type ReleaseCandidateStatus = 'pending' | 'approved' | 'rejected'

export interface ReleaseCandidate {
  id: string
  title: string
  developer?: string
  platforms: string[]
  release_date?: string
  release_date_precision: 'exact' | 'month' | 'quarter' | 'year' | 'unknown'
  description?: string
  image_url?: string
  source: string
  source_url: string
  external_id?: string
  confidence_score: number
  signals: Record<string, unknown>
  status: ReleaseCandidateStatus
  reviewed_at?: string
  approved_release_id?: string
  last_seen_at: string
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  id: string
  timezone: string
  secondary_timezone?: string
  timezone_label: string
  auto_timezone?: boolean
  language: string
  date_format: string
  time_format: '12h' | '24h'
  week_starts_on: 0 | 1
  show_weekends: boolean
  selected_games: string[]
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  backgroundColor: string
  borderColor: string
  textColor: string
  classNames?: string[]
  extendedProps: { gameEvent: GameEvent; game: Game; importanceOrder?: number }
}

export const DEFAULT_SELECTED_GAMES = [
  'world-cup',
  'fortnite',
  'wow',
  'pokemon-go',
  'genshin',
  'lol',
]

export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id'> = {
  timezone: 'UTC',
  timezone_label: 'Home',
  auto_timezone: true,
  language: 'en',
  date_format: 'MM/DD/YYYY',
  time_format: '12h',
  week_starts_on: 0,
  show_weekends: true,
  selected_games: DEFAULT_SELECTED_GAMES,
}
