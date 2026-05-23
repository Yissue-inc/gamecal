'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import type { Game } from '@/types'

interface GameSidebarProps {
  games: Game[]
  selectedGames: string[]
  onToggle: (slug: string) => void
  onToggleAll: (all: boolean) => void
}

export function GameSidebar({ games, selectedGames, onToggle, onToggleAll }: GameSidebarProps) {
  const allSelected = games.every((g) => selectedGames.includes(g.slug))

  return (
    <aside data-testid="game-sidebar" className="flex w-[260px] shrink-0 flex-col border-r border-zinc-800 bg-[#1a1a1a]">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-zinc-400">&lt;&lt; Game Select &gt;&gt;</h2>
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

        {games.map((game) => (
          <div key={game.slug} className="flex items-center gap-2 py-1.5">
            <Checkbox
              id={game.slug}
              data-testid={`game-checkbox-${game.slug}`}
              checked={selectedGames.includes(game.slug)}
              onCheckedChange={() => onToggle(game.slug)}
            />
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: game.brand_color }}
            />
            <Label htmlFor={game.slug} className="cursor-pointer text-sm">
              {game.name}
            </Label>
          </div>
        ))}
      </div>

      <Separator />
      <div className="p-4">
        <Button variant="outline" className="w-full border-zinc-700 text-sm" asChild>
          <a href="/api/feed/all" data-testid="subscribe-all-link" target="_blank" rel="noopener noreferrer">
            + Subscribe All Calendars
          </a>
        </Button>
      </div>
    </aside>
  )
}
