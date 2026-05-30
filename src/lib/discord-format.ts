import { getRewardSignals, getSourceConfidenceLabel } from '@/lib/reward-signals'
import { getEventTypeIcon, getEventTypeLabel, getGamerCountdown } from '@/lib/utils'
import type { Game, GameEvent } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gamecal-beryl.vercel.app'

function discordTimestamp(iso: string, style: 'R' | 'f' = 'R') {
  return `<t:${Math.floor(new Date(iso).getTime() / 1000)}:${style}>`
}

function eventTrackingUrl(game: Game, event: GameEvent, medium: string) {
  const url = new URL(`/games/${game.slug}`, APP_URL)
  url.searchParams.set('event', event.id)
  url.searchParams.set('utm_source', 'gamerclock')
  url.searchParams.set('utm_medium', medium)
  url.searchParams.set('utm_campaign', 'discord_share')
  return url.toString()
}

export function buildDiscordEventMessage(event: GameEvent, game: Game) {
  const reward = getRewardSignals(event, game)
  const rewardLine =
    reward.reward_type !== 'none' && reward.reward_score >= 45
      ? `🎁 **Reward:** ${reward.reward_score} · ${reward.reward_summary ?? 'Reward window'}`
      : null
  const endLine = event.end_at ? `**Ends:** ${discordTimestamp(event.end_at)}` : null
  const description = event.description?.replace(/\s+/g, ' ').trim()
  const sourceLine = `🛡 **Source:** ${getSourceConfidenceLabel(reward.source_confidence)}`

  return [
    `${getEventTypeIcon(event.event_type)} **[${game.name}] ${event.title}**`,
    '',
    `**Type:** ${getEventTypeLabel(event.event_type)} · ${getGamerCountdown(event.start_at, event.end_at)}`,
    `**Starts:** ${discordTimestamp(event.start_at)} (${discordTimestamp(event.start_at, 'f')})`,
    endLine,
    rewardLine,
    sourceLine,
    description ? `> ${description.slice(0, 180)}${description.length > 180 ? '...' : ''}` : null,
    '',
    `📅 Track it on GamerClock: ${eventTrackingUrl(game, event, 'discord')}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildDiscordPartyMessage(game: Game, event: GameEvent, partyUrl: string) {
  const reward = getRewardSignals(event, game)
  const rewardLine =
    reward.reward_type !== 'none' && reward.reward_score >= 45
      ? `🎁 Reward signal: ${reward.reward_score} · ${reward.reward_summary ?? 'Reward window'}`
      : null

  return [
    `🎮 **Squad up for [${game.name}] ${event.title}**`,
    '',
    `When: ${discordTimestamp(event.start_at)} (${discordTimestamp(event.start_at, 'f')})`,
    rewardLine,
    `Source confidence: ${getSourceConfidenceLabel(reward.source_confidence)}`,
    '',
    'Vote on a time to play together:',
    partyUrl,
    '',
    '*Created on GamerClock*',
  ]
    .filter(Boolean)
    .join('\n')
}
