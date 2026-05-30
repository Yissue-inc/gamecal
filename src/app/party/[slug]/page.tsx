import Link from 'next/link'
import { CalendarDays, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GroupCalOption } from '@/lib/groupcal'
import { PartyInstallBanner } from './PartyInstallBanner'

function parseOptions(value?: string): GroupCalOption[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((option) => option && typeof option.label === 'string')
      .map((option) => ({
        label: option.label,
        start_at: typeof option.start_at === 'string' ? option.start_at : undefined,
      }))
  } catch {
    return []
  }
}

function extractGameName(title: string) {
  const match = title.match(/^\[([^\]]+)\]/)
  return match?.[1] ?? 'gaming'
}

export default function PartyPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { title?: string; creator?: string; theme?: string; options?: string }
}) {
  const title = searchParams.title ?? 'GamerClock Party'
  const creator = searchParams.creator ?? 'GamerClock'
  const theme = searchParams.theme ?? '#6366f1'
  const options = parseOptions(searchParams.options)
  const gameName = extractGameName(title)

  return (
    <main className="min-h-screen bg-[#0f0f0f] px-5 py-8 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="font-rajdhani text-xl font-bold">
          Gamer<span className="text-primary">Clock</span>
        </Link>

        <PartyInstallBanner gameName={gameName} hostName={creator} sourceSlug={params.slug} />

        <section
          className="mt-8 overflow-hidden rounded-2xl border bg-zinc-950"
          style={{ borderColor: `${theme}55` }}
        >
          <div
            className="border-b border-zinc-800 p-6"
            style={{
              background: `linear-gradient(135deg, ${theme}33, rgba(24,24,27,0.2))`,
            }}
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <Users className="h-4 w-4" />
              Squad vote
            </div>
            <h1 className="text-3xl font-black leading-tight">{title}</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Created by {creator}. Pick the time that works for your party.
            </p>
          </div>

          <div className="space-y-3 p-6">
            {options.length ? (
              options.map((option, index) => (
                <button
                  key={`${option.label}-${index}`}
                  type="button"
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-left transition-colors hover:border-indigo-500/60 hover:bg-zinc-900"
                >
                  <span>
                    <span className="block font-semibold">{option.label}</span>
                    {option.start_at && (
                      <span className="mt-1 block text-xs text-zinc-500">
                        {new Date(option.start_at).toLocaleString()}
                      </span>
                    )}
                  </span>
                  <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                    Vote
                  </span>
                </button>
              ))
            ) : (
              <p className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-400">
                No time options were attached to this party yet.
              </p>
            )}
          </div>

          <div className="border-t border-zinc-800 p-6">
            <div className="mb-4 flex items-center gap-2 text-xs text-zinc-500">
              <CalendarDays className="h-4 w-4" />
              Party slug: {params.slug}
            </div>
            <Button asChild className="w-full">
              <Link href="/">Open GamerClock Calendar</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
