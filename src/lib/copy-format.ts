import { format, parseISO } from 'date-fns'
import {
  formatDateRange,
  formatTime,
  getEventTypeLabel,
  getGamerCountdown,
} from '@/lib/utils'
import type { Game, GameEvent } from '@/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gamecal-beryl.vercel.app'

export function formatForDiscord(event: GameEvent, game: Game): string {
  const countdown = getGamerCountdown(event.start_at, event.end_at)
  return `🔴 **${event.title}**
> 🎮 ${game.name} · ${getEventTypeLabel(event.event_type)}
> 📅 ${formatDateRange(event.start_at, event.end_at)} · ${formatTime(event.start_at)} UTC
> ⏳ ${countdown}
> 🔗 ${event.source_url ?? `${APP_URL}/${game.slug}`}

Track all ${game.name} events → ${APP_URL}/${game.slug}`
}

export function formatForReddit(event: GameEvent, game: Game): string {
  return `**${event.title} — Add to your calendar!**

| | |
|---|---|
| 🎮 Game | ${game.name} |
| 📅 Date | ${formatDateRange(event.start_at, event.end_at)} |
| 🕐 Time | ${formatTime(event.start_at)} UTC |
| 📍 Type | ${getEventTypeLabel(event.event_type)} |

*via [GamerClock](${APP_URL}) — the gaming event calendar*`
}

export function formatForPlainText(event: GameEvent, game: Game): string {
  return `${event.title} — ${formatDateRange(event.start_at, event.end_at)} @ ${formatTime(event.start_at)} UTC
${game.name} | ${APP_URL}/${game.slug}`
}
