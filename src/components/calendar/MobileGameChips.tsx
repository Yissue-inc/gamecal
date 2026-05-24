'use client'

import type { Game } from '@/types'

interface MobileGameChipsProps {
  games: Game[]
  selectedGames: string[]
  onToggle: (slug: string) => void
}

export function MobileGameChips({ games, selectedGames, onToggle }: MobileGameChipsProps) {
  return (
    <div
      data-testid="mobile-game-chips"
      className="flex gap-2 overflow-x-auto border-b border-zinc-800 px-4 py-2 md:hidden no-scrollbar"
    >
      {games.map((game) => {
        const selected = selectedGames.includes(game.slug)
        return (
          <button
            key={game.slug}
            type="button"
            data-testid={`mobile-chip-${game.slug}`}
            onClick={() => onToggle(game.slug)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
              selected
                ? 'border-transparent text-white'
                : 'border-zinc-700 text-zinc-400'
            }`}
            style={selected ? { backgroundColor: game.brand_color } : undefined}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: game.brand_color }}
            />
            {game.name}
          </button>
        )
      })}
    </div>
  )
}
