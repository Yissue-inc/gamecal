'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { formatForDiscord, formatForReddit, formatForPlainText } from '@/lib/copy-format'
import type { Game, GameEvent } from '@/types'

interface ShareEventProps {
  event: GameEvent
  game: Game
}

export function ShareEvent({ event, game }: ShareEventProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const formats = {
    discord: formatForDiscord(event, game),
    reddit: formatForReddit(event, game),
    plain: formatForPlainText(event, game),
  }

  const copy = async (type: keyof typeof formats) => {
    await navigator.clipboard.writeText(formats[type])
    setCopied(type)
    toast.success(`Copied for ${type === 'plain' ? 'Plain Text' : type.charAt(0).toUpperCase() + type.slice(1)}! ✓`)
    setTimeout(() => setCopied(null), 2000)
  }

  const buttons = [
    { type: 'discord' as const, label: '💬 Discord', testId: 'share-discord-btn' },
    { type: 'reddit' as const, label: '🤖 Reddit', testId: 'share-reddit-btn' },
    { type: 'plain' as const, label: '📋 Copy', testId: 'share-plain-btn' },
  ]

  return (
    <div data-testid="share-event-section" className="flex gap-2">
      {buttons.map(({ type, label, testId }) => (
        <button
          key={type}
          type="button"
          data-testid={testId}
          onClick={() => copy(type)}
          className="flex-1 rounded-md border border-zinc-700 py-1.5 text-xs text-zinc-400 transition-all hover:border-zinc-500 hover:text-white"
        >
          {copied === type ? '✓ Copied!' : label}
        </button>
      ))}
    </div>
  )
}
