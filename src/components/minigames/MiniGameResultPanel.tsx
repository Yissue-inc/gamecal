'use client'

import Link from 'next/link'
import { CalendarDays, RefreshCcw, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type MiniGameResult = {
  score?: number
  durationMs?: number
  result?: 'win' | 'lose' | 'complete'
  rankLabel?: string | null
  stats?: Record<string, unknown>
}

export type MiniGameSaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; isPersonalBest: boolean; best: number }
  | { status: 'unavailable' }
  | { status: 'error'; message: string }

type MiniGameResultPanelProps = {
  result: MiniGameResult
  gameTitle: string
  scoreUnit: string
  isGuest: boolean
  saveState: MiniGameSaveState
  onPlayAgain: () => void
  onSignIn: () => void
  onSaveScore: () => void
  onBackToCalendar: () => void
}

export function MiniGameResultPanel({
  result,
  gameTitle,
  scoreUnit,
  isGuest,
  saveState,
  onPlayAgain,
  onSignIn,
  onSaveScore,
  onBackToCalendar,
}: MiniGameResultPanelProps) {
  const caughtName = typeof result.stats?.fish_name === 'string' ? result.stats.fish_name : null
  const rankLabel = typeof result.rankLabel === 'string' && result.rankLabel ? result.rankLabel : null

  // 저장 상태는 한 줄로만 말한다. 실패해도 플레이한 사실은 지워지지 않는다.
  const saveLine =
    saveState.status === 'saving' ? 'Saving…'
    : saveState.status === 'saved'
      ? (saveState.isPersonalBest ? 'Saved — new personal best.' : `Saved. Your best is still ${saveState.best.toLocaleString()} ${scoreUnit}.`)
    : saveState.status === 'unavailable' ? 'Saving is not switched on yet. Your run still counted.'
    : saveState.status === 'error' ? saveState.message
    : isGuest ? 'Sign in to save this run to your GamerClock profile.'
    : null

  return (
    <aside className="border-t border-cyan-400/25 bg-[#101b30] px-4 py-4 shadow-[0_-12px_40px_rgba(0,0,0,.35)] sm:px-6" aria-live="polite">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-400/15 text-cyan-200">
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-rajdhani text-xl font-bold text-white">{caughtName ? `${caughtName} caught!` : `${gameTitle} result`}</p>
            <p className="text-sm text-zinc-300">
              {typeof result.score === 'number' ? `${result.score.toLocaleString()} ${scoreUnit}` : 'Your journey is recorded for this session.'}
              {rankLabel ? ` · ${rankLabel}` : ''}
            </p>
            {saveLine ? (
              <p className={`mt-0.5 text-xs ${saveState.status === 'error' ? 'text-amber-300' : 'text-cyan-200/80'}`}>{saveLine}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isGuest ? (
            <Button type="button" size="sm" onClick={onSignIn}>Sign in to save</Button>
          ) : saveState.status === 'idle' || saveState.status === 'error' ? (
            <Button type="button" size="sm" onClick={onSaveScore}>
              {saveState.status === 'error' ? 'Try saving again' : 'Save score'}
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={onPlayAgain}>
            <RefreshCcw className="mr-1.5 h-4 w-4" aria-hidden="true" /> Play again
          </Button>
          <Button asChild type="button" variant="secondary" size="sm">
            <Link href="/" onClick={onBackToCalendar}>
              <CalendarDays className="mr-1.5 h-4 w-4" aria-hidden="true" /> Calendar
            </Link>
          </Button>
        </div>
      </div>
    </aside>
  )
}
