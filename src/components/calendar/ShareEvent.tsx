'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { formatForDiscord, formatForReddit, formatForPlainText } from '@/lib/copy-format'
import { buildTwitterShareText } from '@/lib/game-hashtags'
import { getAppUrl } from '@/lib/app-url'
import type { Game, GameEvent } from '@/types'

interface ShareEventProps {
  event: GameEvent
  game: Game
}

export function ShareEvent({ event, game }: ShareEventProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const appUrl = getAppUrl()

  const formats = {
    discord: formatForDiscord(event, game),
    reddit: formatForReddit(event, game),
    plain: formatForPlainText(event, game),
  }

  const copyWithFallback = (text: string) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, text.length)

    let copied = false
    try {
      copied = document.execCommand('copy')
    } finally {
      document.body.removeChild(textarea)
    }

    return copied
  }

  const copy = async (type: keyof typeof formats) => {
    const label = type === 'plain' ? 'Plain Text' : type.charAt(0).toUpperCase() + type.slice(1)

    try {
      await navigator.clipboard.writeText(formats[type])
      setCopied(type)
      toast.success(`Copied for ${label}! ✓`)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      if (copyWithFallback(formats[type])) {
        setCopied(type)
        toast.success(`Copied for ${label}! ✓`)
        setTimeout(() => setCopied(null), 2000)
      } else {
        toast.error('Clipboard permission was blocked. Select and copy from the share text manually.')
      }
    }
  }

  const shareOnX = () => {
    const url = new URL(`/games/${game.slug}`, appUrl)
    url.searchParams.set('event', event.id)
    url.searchParams.set('utm_source', 'gamerclock')
    url.searchParams.set('utm_medium', 'x')
    url.searchParams.set('utm_campaign', 'event_share')
    const text = encodeURIComponent(buildTwitterShareText(event.title, game.name, game.slug))
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url.toString())}`,
      '_blank',
      'noopener'
    )
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
      <button
        type="button"
        data-testid="share-x-btn"
        onClick={shareOnX}
        className="flex-1 rounded-md border border-zinc-700 py-1.5 text-xs text-zinc-400 transition-all hover:border-zinc-500 hover:text-white"
      >
        𝕏 Share
      </button>
    </div>
  )
}
