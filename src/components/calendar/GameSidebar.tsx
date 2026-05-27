'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { DigestSubscribe } from '@/components/calendar/DigestSubscribe'
import { getEventSummary } from '@/lib/event-summary'
import type { Game, GameEvent } from '@/types'

const EVENT_LEGEND = [
  { icon: '🔴', label: 'Live' },
  { icon: '🏆', label: 'Tournament' },
  { icon: '🏁', label: 'Season' },
  { icon: '⭐', label: 'Limited' },
  { icon: '📦', label: 'Patch' },
  { icon: '✨', label: 'New' },
  { icon: '🔄', label: 'Reset' },
  { icon: '⚡', label: '2XP' },
]

interface GameSidebarProps {
  games: Game[]
  selectedGames: string[]
  onToggle: (slug: string) => void
  onToggleAll: (all: boolean) => void
  events?: GameEvent[]
  selectedReleasePlatforms?: string[]
  onToggleReleasePlatform?: (platform: string) => void
  mobile?: boolean
}

const RELEASE_PLATFORMS = [
  { id: 'PC', label: 'PC' },
  { id: 'PS5', label: 'PlayStation / Xbox' },
  { id: 'Switch', label: 'Nintendo Switch' },
  { id: 'Mobile', label: 'Mobile' },
]

export function GameSidebar({
  games,
  selectedGames,
  onToggle,
  onToggleAll,
  events = [],
  selectedReleasePlatforms = [],
  onToggleReleasePlatform,
  mobile = false,
}: GameSidebarProps) {
  const allSelected = games.every((g) => selectedGames.includes(g.slug))
  const Root = mobile ? 'div' : 'aside'

  return (
    <Root
      data-testid={mobile ? 'mobile-game-sidebar' : 'game-sidebar'}
      className={
        mobile
          ? 'flex h-full min-h-0 flex-col bg-[#1a1a1a]'
          : 'hidden w-[220px] shrink-0 flex-col border-r border-zinc-800 bg-[#1a1a1a] md:flex'
      }
    >
      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">🎮</span>
          <h2
            data-testid={mobile ? 'mobile-games-section-header' : 'games-section-header'}
            className="font-rajdhani text-xs font-bold uppercase tracking-widest text-zinc-400"
          >
            {mobile ? 'Next Up' : 'Games'}
          </h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] leading-none text-zinc-500">
          {EVENT_LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1" title={item.label}>
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-4">
        <div className="flex items-center gap-2 py-2">
          <Checkbox
            id="all-games"
            data-testid="game-checkbox-all"
            checked={allSelected}
            onCheckedChange={(checked) => onToggleAll(!!checked)}
          />
          <Label htmlFor="all-games" className="cursor-pointer font-medium">
            All
          </Label>
        </div>

        {games.map((game) => {
          const summary = getEventSummary(events, game.id)
          const isSelected = selectedGames.includes(game.slug)

          return (
            <div key={game.slug} className="py-1.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={game.slug}
                  data-testid={`game-checkbox-${game.slug}`}
                  checked={isSelected}
                  onCheckedChange={() => onToggle(game.slug)}
                />
                <Label
                  htmlFor={game.slug}
                  className="cursor-pointer text-sm font-medium leading-none"
                  style={{ color: isSelected ? '#e4e4e7' : '#71717a' }}
                >
                  {game.name}
                </Label>
              </div>

              {summary.length > 0 && (
                <div
                  data-testid={`game-event-summary-${game.slug}`}
                  className="ml-[34px] mt-1 flex flex-wrap gap-x-2 gap-y-0.5"
                >
                  {summary.map((s) => (
                    <span
                      key={s.type}
                      title={s.label}
                      className="flex items-center gap-0.5 text-[10px] text-zinc-500"
                    >
                      <span>{s.icon}</span>
                      <span className="font-mono">×{s.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        <div className="pt-3">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
            New Release
          </div>
          {RELEASE_PLATFORMS.map((platform) => (
            <div key={platform.id} className="flex items-center gap-2 py-1.5">
              <Checkbox
                id={`release-${platform.id}`}
                data-testid={`release-platform-${platform.id}`}
                checked={selectedReleasePlatforms.includes(platform.id)}
                onCheckedChange={() => onToggleReleasePlatform?.(platform.id)}
              />
              <Label
                htmlFor={`release-${platform.id}`}
                className="cursor-pointer text-sm font-medium leading-none"
                style={{ color: selectedReleasePlatforms.includes(platform.id) ? '#e4e4e7' : '#71717a' }}
              >
                {platform.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />
      <div className="space-y-2 p-4">
        <Button variant="outline" className="w-full border-zinc-700 text-sm" asChild>
          <a href="/api/feed/all" data-testid="subscribe-all-link" target="_blank" rel="noopener noreferrer">
            + Subscribe All Calendars
          </a>
        </Button>
        <Button variant="ghost" className="w-full text-sm text-zinc-400" asChild>
          <Link href="/my-schedule" data-testid="my-schedule-link">My Wishlists</Link>
        </Button>
        <Button variant="ghost" className="w-full text-sm text-zinc-400" asChild>
          <Link href="/profile" data-testid="profile-link">Profile & Badges</Link>
        </Button>
      </div>
      <DigestSubscribe />
    </Root>
  )
}
