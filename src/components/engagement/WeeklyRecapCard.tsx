'use client'

import type { WeeklyRecap } from '@/lib/engagement-store'

interface WeeklyRecapCardProps {
  recap: WeeklyRecap
  onShare?: () => void
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export function WeeklyRecapCard({ recap, onShare }: WeeklyRecapCardProps) {
  const discordText = [
    `GamerClock Weekly Recap - ${recap.weekLabel}`,
    `Events tracked: ${recap.eventsTracked}`,
    `Streak: ${recap.currentStreak} days (best: ${recap.longestStreak})`,
    `${recap.gp} GP - ${recap.prestige.emoji} ${recap.prestige.label}`,
    recap.highPriorityThisWeek > 0 ? `High-priority events this week: ${recap.highPriorityThisWeek}` : '',
    'Track your gaming calendar: https://gamecal-beryl.vercel.app/?utm_source=gamerclock&utm_medium=recap&utm_campaign=weekly_recap',
  ].filter(Boolean).join('\n')

  async function handleDiscordCopy() {
    await copyText(discordText)
    onShare?.()
  }

  function handleXShare() {
    const text = encodeURIComponent(
      `My gaming week: ${recap.eventsTracked} events tracked, ${recap.currentStreak}-day streak, ${recap.gp} GP on GamerClock. #GamerClock #GamingSchedule`
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener')
  }

  return (
    <div data-testid="weekly-recap-card" className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Weekly Recap</div>
          <div className="mt-1 text-sm font-semibold text-zinc-200">{recap.weekLabel}</div>
        </div>
        <span className="rounded-full border border-indigo-500/30 bg-indigo-950/30 px-3 py-1 text-sm font-bold text-indigo-200">
          {recap.prestige.emoji} {recap.prestige.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Tracked', value: recap.eventsTracked },
          { label: 'Streak', value: `${recap.currentStreak}d` },
          { label: 'GP', value: recap.gp },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-center">
            <div className="text-xl font-bold text-white">{stat.value}</div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-zinc-800 bg-black/20 px-3 py-2 text-xs text-zinc-400">
        {recap.highPriorityThisWeek > 0
          ? `${recap.highPriorityThisWeek} high-priority events are coming up this week.`
          : 'Track events and check in to build a stronger weekly recap.'}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleDiscordCopy}
          className="flex-1 rounded-md border border-indigo-500/40 bg-indigo-950/30 px-3 py-2 text-xs font-semibold text-indigo-200 transition hover:border-indigo-400"
        >
          Copy for Discord
        </button>
        <button
          type="button"
          onClick={handleXShare}
          className="flex-1 rounded-md border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500"
        >
          Post on X
        </button>
      </div>
    </div>
  )
}
