'use client'

import { useRef, useState } from 'react'
import { Check, Copy, ExternalLink, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { buildDiscordPartyMessage } from '@/lib/discord-format'
import { addPartyHistoryLocal } from '@/lib/engagement-store'
import { buildOptionsFromEvent, getSquadsFormingCount } from '@/lib/groupcal'
import type { Game, GameEvent } from '@/types'

interface PartyButtonProps {
  event: GameEvent
  game: Game
}

type Status = 'idle' | 'loading' | 'done' | 'error'

const DISCORD_ICON = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.25-.191.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
  </svg>
)

async function copyText(value: string, input?: HTMLInputElement | null) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    try {
      const copied = document.execCommand('copy')
      if (!copied && input) {
        input.focus()
        input.select()
        return document.execCommand('copy')
      }
      return copied
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

export function PartyButton({ event, game }: PartyButtonProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [partyUrl, setPartyUrl] = useState<string | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const squadsForming = getSquadsFormingCount(event.id)

  async function handleCreate() {
    setStatus('loading')
    try {
      const options = buildOptionsFromEvent(event.start_at, event.end_at ?? null, game.name)
      const res = await fetch('/api/party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[${game.name}] ${event.title} — Squad Up`,
          created_by: 'GamerClock',
          vibe: 'game',
          theme_color: game.brand_color,
          options,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? 'Party API error')
      }

      setPartyUrl(data.url)
      setIsFallback(Boolean(data.fallback))
      addPartyHistoryLocal({
        eventId: event.id,
        eventTitle: event.title,
        gameName: game.name,
        url: data.url,
        createdAt: new Date().toISOString(),
        fallback: Boolean(data.fallback),
      })
      setStatus('done')
      toast.success(data.fallback ? 'Party link ready. GroupCal sync can be added later.' : 'Party link ready')
    } catch (error) {
      setStatus('error')
      toast.error(error instanceof Error ? error.message : 'Failed to create party')
    }
  }

  async function handleCopy() {
    if (!partyUrl) return
    const ok = await copyText(partyUrl, inputRef.current)
    if (ok) {
      setCopied(true)
      toast.success('Party link copied')
      window.setTimeout(() => setCopied(false), 2000)
    } else {
      toast.error('Copy blocked. Select the link and copy it manually.')
    }
  }

  async function handleDiscordCopy() {
    if (!partyUrl) return
    const ok = await copyText(buildDiscordPartyMessage(game, event, partyUrl), inputRef.current)
    if (ok) {
      setCopied(true)
      toast.success('Discord message copied', {
        description: 'Paste it in your server so friends can vote on a squad time.',
        icon: '💬',
      })
      window.setTimeout(() => setCopied(false), 2000)
    } else {
      toast.error('Copy blocked. Select the link and copy it manually.')
    }
  }

  function handleTwitter() {
    if (!partyUrl) return
    const text = encodeURIComponent(`Who's down for [${game.name}]? Vote on a time here:`)
    const url = encodeURIComponent(partyUrl)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener')
  }

  if (status === 'done' && partyUrl) {
    return (
      <div
        data-testid="party-result-panel"
        className="space-y-3 rounded-lg border p-4"
        style={{ borderColor: `${game.brand_color}55`, background: `${game.brand_color}11` }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-100">Party link ready</div>
            {isFallback && (
              <div className="mt-0.5 text-xs text-amber-300">
                Local voting page active. GroupCal API key can upgrade this link later.
              </div>
            )}
          </div>
          <div className="rounded-full bg-black/30 px-2 py-1 text-[11px] font-semibold text-zinc-300">
            {squadsForming} squads
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            readOnly
            value={partyUrl}
            aria-label="Party link"
            className="min-w-0 flex-1 truncate rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300"
          />
          <Button size="icon" variant="ghost" onClick={handleCopy} className="shrink-0" aria-label="Copy party link">
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-[#5865F2]/40 text-xs text-[#5865F2] hover:bg-[#5865F2]/10"
            onClick={handleDiscordCopy}
          >
            {DISCORD_ICON}
            <span>Copy for Discord</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"
            onClick={handleTwitter}
          >
            𝕏 <span>Post on X</span>
          </Button>
        </div>
        <a
          href={partyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
        >
          <ExternalLink className="h-3 w-3" />
          Open voting page
        </a>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <Button
        data-testid="party-create-btn"
        variant="outline"
        className="w-full border-red-800/50 text-red-400 hover:bg-red-950/30"
        onClick={handleCreate}
      >
        Failed to create party. Try again
      </Button>
    )
  }

  return (
    <Button
      data-testid="party-create-btn"
      variant="outline"
      className="w-full border-zinc-700 hover:border-zinc-500"
      style={{ borderColor: `${game.brand_color}44` }}
      onClick={handleCreate}
      disabled={status === 'loading'}
    >
      <Users className="h-4 w-4" />
      {status === 'loading' ? 'Creating party...' : `Create Party · ${squadsForming} squads`}
    </Button>
  )
}
