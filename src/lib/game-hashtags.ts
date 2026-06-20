const GAME_HASHTAGS: Record<string, string[]> = {
  'world-cup': ['WorldCup', 'ROAR', 'GamerClock'],
  fortnite: ['Fortnite', 'FortniteSeason', 'GamerClock'],
  wow: ['WorldOfWarcraft', 'WoW', 'GamerClock'],
  'pokemon-go': ['PokemonGO', 'PokemonGOEvents', 'GamerClock'],
  genshin: ['GenshinImpact', 'Genshin', 'GamerClock'],
  lol: ['LeagueOfLegends', 'LoL', 'GamerClock'],
  valorant: ['VALORANT', 'GamerClock'],
  apex: ['ApexLegends', 'GamerClock'],
  'apex-legends': ['ApexLegends', 'GamerClock'],
  destiny: ['Destiny2', 'GamerClock'],
  'destiny-2': ['Destiny2', 'GamerClock'],
  'diablo-iv': ['DiabloIV', 'GamerClock'],
}

export function getGameHashtags(gameSlug: string): string[] {
  return GAME_HASHTAGS[gameSlug] ?? ['Gaming', 'GamerClock']
}

export function buildTwitterShareText(
  eventTitle: string,
  gameName: string,
  gameSlug: string,
  partyUrl?: string
): string {
  const hashtags = getGameHashtags(gameSlug)
    .map((tag) => `#${tag}`)
    .join(' ')

  if (partyUrl) {
    return `🎮 Squad up for ${gameName}: ${eventTitle}\nVote on a time: ${partyUrl}\n\n${hashtags}`
  }

  return `📅 Tracking [${gameName}] ${eventTitle} on GamerClock\n\n${hashtags}`
}
