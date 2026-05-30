import {
  formatDateRange,
  formatTime,
  formatTimeRange,
  getEventTypeLabel,
  withGamerClockUtm,
} from '@/lib/utils'
import { buildDiscordEventMessage } from '@/lib/discord-format'
import { getRewardSignals, getSourceConfidenceLabel } from '@/lib/reward-signals'
import type { Game, GameEvent } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gamecal-beryl.vercel.app'

function getShareUrl(game: Game, event?: GameEvent, medium = 'discord') {
  const path = `/games/${game.slug}`
  const url = new URL(path, APP_URL)
  if (event?.id) url.searchParams.set('event', event.id)
  url.searchParams.set('utm_source', 'gamerclock')
  url.searchParams.set('utm_medium', medium)
  url.searchParams.set('utm_campaign', event ? 'event_share' : 'game_share')
  return url.toString()
}

function getSourceUrl(event: GameEvent) {
  return event.source_url ? withGamerClockUtm(event.source_url, 'share_source') : null
}

function formatRewardLine(event: GameEvent, game: Game) {
  const reward = getRewardSignals(event, game)
  if (reward.reward_type === 'none' || reward.reward_score < 45) return null
  const label = reward.reward_summary ?? 'Reward opportunity'
  return `🎁 ${reward.reward_score} · ${label}`
}

export function formatForDiscord(event: GameEvent, game: Game): string {
  return buildDiscordEventMessage(event, game)
}

export function formatForReddit(event: GameEvent, game: Game): string {
  const rewardLine = formatRewardLine(event, game)
  const reward = getRewardSignals(event, game)
  const trackUrl = getShareUrl(game, event, 'reddit')
  const sourceUrl = getSourceUrl(event)
  return `**${event.title} — track it on GamerClock**

| | |
|---|---|
| 🎮 Game | ${game.name} |
| 📅 Date | ${formatDateRange(event.start_at, event.end_at)} |
| 🕐 Time | ${formatTimeRange(event.start_at, event.end_at)} |
| 📍 Type | ${getEventTypeLabel(event.event_type)} |
| 🎁 Reward | ${rewardLine?.replace('🎁 ', '') ?? 'No reward signal yet'} |
| 🛡 Source | ${getSourceConfidenceLabel(reward.source_confidence)}${sourceUrl ? ` — ${sourceUrl}` : ''} |

Add it to your gaming calendar: ${trackUrl}`
}

export function formatForPlainText(event: GameEvent, game: Game): string {
  const rewardLine = formatRewardLine(event, game)
  return [
    `${event.title} — ${game.name}`,
    `${formatDateRange(event.start_at, event.end_at)} · ${formatTime(event.start_at)}`,
    rewardLine,
    getShareUrl(game, event, 'copy'),
  ]
    .filter(Boolean)
    .join('\n')
}
