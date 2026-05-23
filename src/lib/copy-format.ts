import { format, parseISO } from 'date-fns'
import {
  formatDateRange,
  formatTime,
  getImportanceEmoji,
  getEventTypeLabel,
} from '@/lib/utils'
import type { Game, GameEvent } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gamecal.io'

function getCountdownText(dateStr: string): string {
  const target = new Date(dateStr)
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `Ends in ${days} days`
  return `Ends in ${hours}h`
}

export function formatForDiscord(event: GameEvent, game: Game): string {
  const endDate = event.end_at ?? event.start_at
  const countdown = getCountdownText(endDate)
  return `🎮 **[${game.name}] ${event.title}**
📅 ${formatDateRange(event.start_at, event.end_at)} · ${formatTime(event.start_at)} → ${event.end_at ? formatTime(event.end_at) : formatTime(event.start_at)} UTC
${getImportanceEmoji(event.importance)} ${getEventTypeLabel(event.event_type)} | ⏱ ${countdown}

> ${event.description || 'Check the official source for details!'}

🔗 gamecal.io/${game.slug}
📋 Add to your calendar: ${APP_URL}/api/feed/${game.slug}`
}

export function formatForReddit(event: GameEvent, game: Game): string {
  const startFormatted = format(parseISO(event.start_at), 'MMMM d (EEE)')
  const endFormatted = event.end_at
    ? format(parseISO(event.end_at), 'MMMM d (EEE)')
    : startFormatted
  return `**[${game.name}] ${event.title}** | ${formatDateRange(event.start_at, event.end_at)}

📅 ${startFormatted} to ${endFormatted} · ${formatTime(event.start_at)} – ${event.end_at ? formatTime(event.end_at) : formatTime(event.start_at)} UTC
⚡ ${event.description || 'Check the official source for details!'}

Source: [${game.name}](${event.source_url || APP_URL}) | 📅 [Add to Calendar](${APP_URL}/${game.slug})

*Track all ${game.name} events automatically → [GAMECAL](${APP_URL})*`
}

export function formatForPlainText(event: GameEvent, game: Game): string {
  return `🎮 ${game.name} – ${event.title}
📅 ${formatDateRange(event.start_at, event.end_at)} · ${formatTime(event.start_at)} UTC
⚡ ${event.description || 'Limited event — check official source!'}
👉 gamecal.io/${game.slug}`
}
