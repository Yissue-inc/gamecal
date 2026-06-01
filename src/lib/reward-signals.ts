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
    reward_score: 41,
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
  // ── XP / 부스트 ──────────────────────────────────────────────────────────
  {
    // "supercharged xp"도 포함
    match: /\b(double\s*xp|2xp|bonus xp|xp boost|boosted xp|experience boost|supercharged xp)\b/i,
    type: 'xp_boost',
    summary: 'Boosted XP gains',
    rarity: 'limited',
    score: 92,
    timeLimited: true,
  },
  // ── 코스메틱 ─────────────────────────────────────────────────────────────
  {
    match: /\b(skin|outfit|cosmetic|style|emote|spray|wrap|mount|pet)\b/i,
    type: 'skin',
    summary: 'Cosmetic reward opportunity',
    rarity: 'limited',
    score: 86,
    timeLimited: true,
  },
  // ── 통화 / 리소스 ─────────────────────────────────────────────────────────
  {
    // rivalry credits, star bits 등 게임 내 크레딧 류 포함
    match: /\b(primogem|v-?bucks|coins?|currency|tokens?|stardust|candy|gems?|gold|credits?|rivalry credits?)\b/i,
    type: 'currency',
    summary: 'Currency or resource reward',
    rarity: 'limited',
    score: 82,
    timeLimited: true,
  },
  // ── 로그인 보너스 ─────────────────────────────────────────────────────────
  {
    match: /\b(login bonus|daily login|check[-\s]?in reward|sign[-\s]?in bonus)\b/i,
    type: 'login_bonus',
    summary: 'Login bonus reward',
    rarity: 'limited',
    score: 84,
    timeLimited: true,
  },
  // ── 배너 / 픽업 ──────────────────────────────────────────────────────────
  {
    match: /\b(banner|character banner|wish|pull|limited character|featured character)\b/i,
    type: 'banner',
    summary: 'Limited banner or featured character',
    rarity: 'time_limited',
    score: 88,
    timeLimited: true,
  },
  // ── 패스 / 배틀패스 진행 ─────────────────────────────────────────────────
  {
    match: /\b(battle\s*pass|go\s*pass|season\s*pass|reward\s*pass|pass\s*tier)\b/i,
    type: 'progression',
    summary: 'Pass or reward-track progression',
    rarity: 'limited',
    score: 76,
    timeLimited: true,
  },
  // ── 레이드 / 던전 (진짜 레이드 드롭만) ───────────────────────────────────
  {
    // "loot" 단독은 제외 — raid/boss/dungeon/chest/mythic+ 처럼 명확한 PvE 문맥만
    match: /\b(raid(?!\s*hour)(?!\s*battle)|chest|boss(?!\s*pass)|dungeon|mythic\+|lockout)\b/i,
    type: 'raid_drop',
    summary: 'Raid or dungeon loot window',
    rarity: 'common',
    score: 70,
  },
  // ── Raid Hour (Pokémon GO 등) — tournament_prize가 아닌 live_event 계열 ──
  {
    match: /\b(raid\s*hour|raid\s*day|raid\s*weekend)\b/i,
    type: 'raid_drop',
    summary: 'Raid hour — bonus raid appearance window',
    rarity: 'limited',
    score: 74,
    timeLimited: true,
  },
  // ── 토너먼트 / Twitch 드롭 (진짜 경쟁·시청 보상) ───────────────────────
  {
    // "drops" 단독·"drop in/drop by" 제외 → twitch drops / viewer drops / tournament/cup/prize 만
    match: /\b(tournament|cup|prize|twitch\s*drops?|viewer\s*drops?|reward\s*track|fncs|esports|cash\s*priz(?:e|ing))\b/i,
    type: 'tournament_prize',
    summary: 'Competitive reward or viewing drops',
    rarity: 'limited',
    score: 78,
    timeLimited: true,
  },
  // ── 한정 시간 아이템 (bare "ends"·"end" 제외 — "ending soon"·"last chance"만) ──
  {
    match: /\b(limited|exclusive|last\s*chance|ending\s*soon|time[-\s]?limited)\b/i,
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

  // 수동 저장 필드가 의미있는 값을 갖는 경우에만 override
  // reward_score=0 / reward_type=null 인 "빈 행"은 inferred를 그대로 사용
  const hasManualReward =
    (Boolean(event.reward_type) && event.reward_type !== 'none') ||
    Boolean(event.reward_summary) ||
    (Boolean(event.reward_rarity) && event.reward_rarity !== 'common') ||
    Boolean(event.source_confidence) ||
    event.is_time_limited_reward === true ||
    (typeof event.reward_score === 'number' && event.reward_score > 0)

  if (!hasManualReward) return inferred

  return {
    ...inferred,
    reward_type: event.reward_type ?? inferred.reward_type,
    reward_summary: event.reward_summary ?? inferred.reward_summary,
    reward_rarity: event.reward_rarity ?? inferred.reward_rarity,
    // 저장된 score가 0이면 inferred 점수 사용 (크롤러 기본값 0 문제 방지)
    reward_score:
      typeof event.reward_score === 'number' && event.reward_score > 0
        ? event.reward_score
        : inferred.reward_score,
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
  if (confidence === 'official') return '✅ Official'
  if (confidence === 'media') return '📰 Reported'
  return '🕵️ Rumored'
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
