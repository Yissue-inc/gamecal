'use client'

import type { CalMood } from '@/lib/cal-messages'
import { getCalEmoji } from '@/lib/cal-messages'

interface CalCharacterProps {
  mood?: CalMood
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function CalCharacter({ mood = 'idle', size = 'md', className = '' }: CalCharacterProps) {
  const sizeClass = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-4xl' : 'text-2xl'

  return (
    <span
      data-testid="cal-character"
      data-cal-mood={mood}
      className={`select-none ${sizeClass} ${className}`}
      aria-label="CAL mascot"
    >
      {getCalEmoji(mood)}
    </span>
  )
}
