import type { Game, GameEvent } from '@/types'

const GAME_ART_BY_SLUG: Record<string, string> = {
  'world-cup': '/mini-cup/assets/themes/hero-stadium.webp',
  fortnite: 'https://images.igdb.com/igdb/image/upload/t_1080p/cobz58.jpg',
  apex: 'https://images.igdb.com/igdb/image/upload/t_1080p/coc1di.jpg',
  valorant: 'https://images.igdb.com/igdb/image/upload/t_1080p/cobtjo.jpg',
  lol: 'https://images.igdb.com/igdb/image/upload/t_1080p/cobpn7.jpg',
  destiny2: 'https://images.igdb.com/igdb/image/upload/t_1080p/cobj1z.jpg',
  diablo4: 'https://images.igdb.com/igdb/image/upload/t_1080p/co69sm.jpg',
  wow: 'https://images.igdb.com/igdb/image/upload/t_1080p/co2l7z.jpg',
  'pokemon-go': 'https://images.igdb.com/igdb/image/upload/t_1080p/coc29g.jpg',
  genshin: 'https://images.igdb.com/igdb/image/upload/t_1080p/coa9dy.jpg',
}

export function getGameArtUrl(game?: Pick<Game, 'slug' | 'icon_url'> | null): string | null {
  if (!game) return null
  return game.icon_url ?? GAME_ART_BY_SLUG[game.slug] ?? null
}

export function getEventArtUrl(event: Pick<GameEvent, 'image_url'>, game?: Pick<Game, 'slug' | 'icon_url'> | null): string | null {
  return event.image_url ?? getGameArtUrl(game)
}

export function getGameArtStyle(game?: Pick<Game, 'slug' | 'icon_url' | 'brand_color'> | null) {
  const art = getGameArtUrl(game)
  if (art) {
    return {
      backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.1)), url(${art})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }

  return {
    background: `linear-gradient(135deg, ${game?.brand_color ?? '#6366f1'}55 0%, #18181b 100%)`,
  }
}

export function getEventFallbackDescription(event: GameEvent, game: Game): string {
  if (event.description?.trim()) return event.description

  const gameName = game.name
  const fallbackByType: Record<GameEvent['event_type'], string> = {
    weekly_reset: `${gameName} weekly activities, quests, rewards, and lockouts refresh on this schedule.`,
    season_start: `${gameName} starts a new season with fresh progression, rewards, and event rotations.`,
    season_end: `${gameName} season content is ending soon. Finish remaining quests and claim rewards before it closes.`,
    live_event: `${gameName} has a live event window active for players to join, track, and plan around.`,
    limited_reward: `${gameName} limited-time rewards are available during this event window.`,
    patch_release: `${gameName} update window with balance changes, content updates, or system fixes.`,
    tournament: `${gameName} competitive event window for tournament matches, rewards, or viewing drops.`,
    ranked_reset: `${gameName} ranked progression resets or starts a new competitive split.`,
    banner_end: `${gameName} banner or limited offer is ending. Wishlist it if you want CAL to keep watch.`,
    double_xp: `${gameName} bonus progression event with boosted XP or reward gains.`,
    maintenance: `${gameName} service maintenance window. Availability may be limited during this time.`,
    new_content: `${gameName} new content drop with fresh activities, characters, modes, or rewards.`,
    other: `${gameName} scheduled game event. Track it here so it stays visible in your calendar.`,
  }

  return fallbackByType[event.event_type]
}
