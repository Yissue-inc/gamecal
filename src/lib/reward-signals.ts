import type {
  EventType,
  Game,
  GameEvent,
  RewardRarity,
  RewardType,
  SourceConfidence,
} from '@/types'

export interface RewardSignals {
  reward_type: RewardType
  reward_summary?: string
  reward_rarity: RewardRarity
  reward_score: number
  is_time_limited_reward: boolean
  source_confidence: SourceConfidence
}

const TYPE_BASE: Record<EventType, Partial<RewardSignals>> = {
  weekly_reset: {
    reward_type: 'progression',
    reward_summary: 'Weekly progression and reward reset',
    reward_rarity: 'common',
    reward_score: 35,
  },
  season_start: {
    reward_type: 'content',
    reward_summary: 'New season progression and rewards',
    reward_rarity: 'limited',
    reward_score: 65,
    is_time_limited_reward: true,
  },
  season_end: {
    reward_type: 'content',
    reward_summary: 'Last chance for seasonal rewards',
    reward_rarity: 'time_limited',
    reward_score: 78,
    is_time_limited_reward: true,
  },
  live_event: {
    reward_type: 'content',
    reward_summary: 'Live event participation window',
    reward_rarity: 'limited',
    reward_score: 62,
    is_time_limited_reward: true,
  },
  limited_reward: {
    reward_type: 'item',
    reward_summary: 'Limited-time reward event',
    reward_rarity: 'limited',
    reward_score: 78,
    is_time_limited_reward: true,
  },
  patch_release: {
    reward_type: 'content',
    reward_summary: 'Patch content and balance update',
    reward_rarity: 'common',
    reward_score: 50,
  },
  tournament: {
    reward_type: 'tournament_prize',
    reward_summary: 'Tournament rewards or viewing drops',
    reward_rarity: 'limited',
    reward_score: 76,
    is_time_limited_reward: true,
  },
  ranked_reset: {
    reward_type: 'progression',
    reward_summary: 'Ranked progression reset',
    reward_rarity: 'common',
    reward_score: 58,
  },
  banner_end: {
    reward_type: 'banner',
    reward_summary: 'Limited banner or offer ending',
    reward_rarity: 'time_limited',
    reward_score: 86,
    is_time_limited_reward: true,
  },
  double_xp: {
    reward_type: 'xp_boost',
    reward_summary: 'Boosted XP or progression gains',
    reward_rarity: 'limited',
    reward_score: 88,
    is_time_limited_reward: true,
  },
  maintenance: {
    reward_type: 'none',
    reward_rarity: 'common',
    reward_score: 0,
  },
  new_content: {
    reward_type: 'content',
    reward_summary: 'New content, modes, characters, or activities',
    reward_rarity: 'limited',
    reward_score: 60,
    is_time_limited_reward: true,
  },
  other: {
    reward_type: 'none',
    reward_rarity: 'common',
    reward_score: 0,
  },
}

const KEYWORD_RULES: Array<{
  match: RegExp
  type: RewardType
  summary: string
  rarity: RewardRarity
  score: number
  timeLimited?: boolean
}> = [
  {
    match: /\b(double\s*xp|2xp|bonus xp|xp boost|boosted xp|experience boost)\b/i,
    type: 'xp_boost',
    summary: 'Boosted XP gains',
    rarity: 'limited',
    score: 92,
    timeLimited: true,
  },
  {
    match: /\b(skin|outfit|cosmetic|style|emote|spray|wrap|mount|pet)\b/i,
    type: 'skin',
    summary: 'Cosmetic reward opportunity',
    rarity: 'limited',
    score: 86,
    timeLimited: true,
  },
  {
    match: /\b(primogem|v-?bucks|coins?|currency|tokens?|stardust|candy|gems?|gold)\b/i,
    type: 'currency',
    summary: 'Currency or resource reward',
    rarity: 'limited',
    score: 82,
    timeLimited: true,
  },
  {
    match: /\b(login bonus|daily login|check[-\s]?in reward|sign[-\s]?in bonus)\b/i,
    type: 'login_bonus',
    summary: 'Login bonus reward',
    rarity: 'limited',
    score: 84,
    timeLimited: true,
  },
  {
    match: /\b(banner|character banner|wish|pull|limited character|featured character)\b/i,
    type: 'banner',
    summary: 'Limited banner or featured character',
    rarity: 'time_limited',
    score: 88,
    timeLimited: true,
  },
  {
    match: /\b(raid|drop|loot|chest|boss|dungeon|mythic\+|lockout)\b/i,
    type: 'raid_drop',
    summary: 'Loot, drop, or raid reward window',
    rarity: 'common',
    score: 70,
  },
  {
    match: /\b(tournament|cup|prize|drops?|twitch drops?|reward track)\b/i,
    type: 'tournament_prize',
    summary: 'Competitive reward or drops',
    rarity: 'limited',
    score: 78,
    timeLimited: true,
  },
  {
    match: /\b(limited|exclusive|last chance|ends?|ending soon|time[-\s]?limited)\b/i,
    type: 'item',
    summary: 'Time-limited reward window',
    rarity: 'time_limited',
    score: 74,
    timeLimited: true,
  },
]

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function sourceConfidenceFromUrl(sourceUrl?: string): SourceConfidence {
  if (!sourceUrl) return 'inferred'
  if (
    /fortnite\.com|worldofwarcraft\.com|leagueoflegends\.com|pokemongolive\.com|hoyoverse\.com|genshin\.hoyoverse\.com/i.test(
      sourceUrl
    )
  ) {
    return 'official'
  }
  return 'media'
}

export function inferRewardSignals(
  event: Partial<GameEvent>,
  game?: Partial<Game> | null
): RewardSignals {
  const base = TYPE_BASE[event.event_type ?? 'other']
  const text = [event.title, event.description, game?.name].filter(Boolean).join(' ')
  let inferred: RewardSignals = {
    reward_type: base.reward_type ?? 'none',
    reward_summary: base.reward_summary,
    reward_rarity: base.reward_rarity ?? 'common',
    reward_score: base.reward_score ?? 0,
    is_time_limited_reward: base.is_time_limited_reward ?? false,
    source_confidence: sourceConfidenceFromUrl(event.source_url),
  }

  for (const rule of KEYWORD_RULES) {
    if (!rule.match.test(text)) continue
    if (rule.score >= inferred.reward_score) {
      inferred = {
        ...inferred,
        reward_type: rule.type,
        reward_summary: rule.summary,
        reward_rarity: rule.rarity,
        reward_score: rule.score,
        is_time_limited_reward: rule.timeLimited ?? inferred.is_time_limited_reward,
      }
    } else if (rule.timeLimited) {
      inferred.is_time_limited_reward = true
      inferred.reward_score = Math.max(inferred.reward_score, rule.score)
      inferred.reward_rarity = rule.rarity
    }
  }

  if (event.importance === 'critical') inferred.reward_score += 12
  if (event.importance === 'high') inferred.reward_score += 6
  if (event.end_at && inferred.reward_score > 0) inferred.is_time_limited_reward = true

  return {
    ...inferred,
    reward_score: clampScore(inferred.reward_score),
  }
}

export function getRewardSignals(event: GameEvent, game?: Game | null): RewardSignals {
  const inferred = inferRewardSignals(event, game ?? event.game)
  const hasManualReward =
    Boolean(event.reward_type) ||
    Boolean(event.reward_summary) ||
    Boolean(event.reward_rarity) ||
    Boolean(event.source_confidence) ||
    event.is_time_limited_reward === true

  if (!hasManualReward) return inferred

  return {
    ...inferred,
    reward_type: event.reward_type ?? inferred.reward_type,
    reward_summary: event.reward_summary ?? inferred.reward_summary,
    reward_rarity: event.reward_rarity ?? inferred.reward_rarity,
    reward_score: event.reward_score ?? inferred.reward_score,
    is_time_limited_reward: event.is_time_limited_reward ?? inferred.is_time_limited_reward,
    source_confidence: event.source_confidence ?? inferred.source_confidence,
  }
}

export function getRewardSortScore(event: GameEvent): number {
  const reward = getRewardSignals(event, event.game)
  const liveBonus =
    new Date(event.start_at).getTime() <= Date.now() &&
    (!event.end_at || new Date(event.end_at).getTime() >= Date.now())
      ? 15
      : 0
  const limitedBonus = reward.is_time_limited_reward ? 10 : 0
  return clampScore(reward.reward_score + liveBonus + limitedBonus)
}

export function getRewardBadgeLabel(event: GameEvent): string | null {
  const reward = getRewardSignals(event, event.game)
  if (reward.reward_score < 45 || reward.reward_type === 'none') return null
  return reward.reward_summary ?? 'Reward event'
}

export function getSourceConfidenceLabel(confidence: SourceConfidence | string | undefined): string {
  if (confidence === 'official') return 'Official'
  if (confidence === 'media') return 'Reported'
  return 'Rumored'
}

export function getSourceConfidenceTone(confidence: SourceConfidence | string | undefined): string {
  if (confidence === 'official') return 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300'
  if (confidence === 'media') return 'border-sky-500/50 bg-sky-950/30 text-sky-300'
  if (confidence === 'inferred') return 'border-amber-500/40 bg-amber-950/20 text-amber-400'
  return 'border-zinc-600 bg-zinc-900 text-zinc-400'
}

export function getSourceConfidenceTooltip(confidence: SourceConfidence | string | undefined): string {
  if (confidence === 'official') return 'Confirmed by developers or publishers'
  if (confidence === 'media') return 'Reported by gaming media'
  return 'Based on leaks, patterns, or incomplete source signals'
}
