'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { adminFetch } from '@/lib/admin-fetch'
import type { ReleaseCandidate, ReleaseCandidateStatus } from '@/types'
import { toast } from 'sonner'

const STATUS_OPTIONS: Array<{ value: ReleaseCandidateStatus | 'all'; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All platforms' },
  { value: 'PC', label: 'PC' },
  { value: 'PS5', label: 'PlayStation' },
  { value: 'Xbox', label: 'Xbox' },
  { value: 'Switch', label: 'Nintendo Switch' },
  { value: 'Mobile', label: 'Mobile' },
]

const IMAGE_FALLBACK_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#18181b"/><rect x="1" y="1" width="638" height="358" fill="none" stroke="#3f3f46" stroke-width="2"/><text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="#a1a1aa" font-family="Arial, sans-serif" font-size="28" font-weight="700">Image unavailable</text><text x="50%" y="59%" dominant-baseline="middle" text-anchor="middle" fill="#71717a" font-family="Arial, sans-serif" font-size="18">Check RAWG / IGDB enrichment</text></svg>`
  )

function platformsToText(platforms: string[]) {
  return platforms.join(', ')
}

function textToPlatforms(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getSignalText(candidate: ReleaseCandidate) {
  const signals = candidate.signals ?? {}
  const ranking = Array.isArray(signals.ranking_sources)
    ? signals.ranking_sources.join(', ')
    : undefined
  const rawgGenres = Array.isArray(signals.rawg_genres) ? signals.rawg_genres.join(', ') : undefined
  const igdbGenres = Array.isArray(signals.igdb_genres) ? signals.igdb_genres.join(', ') : undefined
  return [
    signals.source_label ? `Source: ${signals.source_label}` : null,
    signals.release_text ? `Release text: ${signals.release_text}` : null,
    ranking ? `Signals: ${ranking}` : null,
    rawgGenres ? `RAWG genres: ${rawgGenres}` : null,
    igdbGenres ? `IGDB genres: ${igdbGenres}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function getMetadataBadges(candidate: ReleaseCandidate) {
  const signals = candidate.signals ?? {}
  return [
    signals.rawg_enriched ? 'RAWG' : null,
    signals.igdb_enriched ? 'IGDB' : null,
    typeof signals.rawg_metacritic === 'number' ? `MC ${signals.rawg_metacritic}` : null,
    typeof signals.metadata_completeness === 'number'
      ? `Meta ${signals.metadata_completeness}/100`
      : null,
  ].filter(Boolean) as string[]
}

export default function ReleaseCandidatesPage() {
  const [status, setStatus] = useState<ReleaseCandidateStatus | 'all'>('pending')
  const [candidates, setCandidates] = useState<ReleaseCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [platformFilter, setPlatformFilter] = useState('all')
  const [editing, setEditing] = useState<Record<string, Partial<ReleaseCandidate>>>({})

  const counts = useMemo(() => {
    return candidates.reduce(
      (acc, candidate) => {
        acc[candidate.status] += 1
        return acc
      },
      { pending: 0, approved: 0, rejected: 0 } as Record<ReleaseCandidateStatus, number>
    )
  }, [candidates])

  const filteredCandidates = useMemo(() => {
    if (platformFilter === 'all') return candidates
    return candidates.filter((candidate) => candidate.platforms.includes(platformFilter))
  }, [candidates, platformFilter])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await adminFetch(`/api/admin/release-candidates?status=${status}`)
    const data = await res.json()
    if (res.ok) {
      setCandidates(data.candidates ?? [])
    } else {
      setCandidates([])
      toast.error(data.error ?? 'Failed to load candidates')
    }
    setLoading(false)
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  const patchCandidate = (id: string, patch: Partial<ReleaseCandidate>) => {
    setEditing((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }))
  }

  const saveCandidate = async (candidate: ReleaseCandidate) => {
    const patch = editing[candidate.id]
    if (!patch) return

    const res = await adminFetch(`/api/admin/release-candidates/${candidate.id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
    const data = await res.json()
    if (res.ok) {
      setCandidates((prev) =>
        prev.map((item) => (item.id === candidate.id ? data.candidate : item))
      )
      setEditing((prev) => {
        const next = { ...prev }
        delete next[candidate.id]
        return next
      })
      toast.success('Candidate saved')
    } else {
      toast.error(data.error ?? 'Save failed')
    }
  }

  const crawl = async () => {
    setRunning(true)
    const res = await adminFetch('/api/admin/release-candidates/crawl', {
      method: 'POST',
      body: JSON.stringify({ source: 'all' }),
    })
    const data = await res.json()
    setRunning(false)

    if (res.ok) {
      toast.success('Release crawl complete', {
        description: `Inserted ${data.inserted}, updated ${data.updated}`,
      })
      await load()
    } else {
      toast.error(data.error ?? 'Crawl failed')
    }
  }

  const review = async (candidate: ReleaseCandidate, action: 'approve' | 'reject') => {
    if (editing[candidate.id]) {
      await saveCandidate(candidate)
    }

    const res = await adminFetch(`/api/admin/release-candidates/${candidate.id}/${action}`, {
      method: 'POST',
    })
    const data = await res.json()

    if (res.ok) {
      toast.success(action === 'approve' ? 'Release published' : 'Candidate rejected')
      setCandidates((prev) => prev.filter((item) => item.id !== candidate.id))
    } else {
      toast.error(data.error ?? `${action} failed`)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Release Candidate Queue</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Official sources create candidates here first. Approving a row publishes it to New Releases.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="http://127.0.0.1:8010/queue?week=2026-5%2F18W" target="_blank">
              Editorial Queue
            </Link>
          </Button>
          <Button data-testid="crawl-release-candidates" disabled={running} onClick={crawl}>
            {running ? 'Crawling...' : 'Crawl Sources'}
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs uppercase text-zinc-500">Pending</p>
            <p className="mt-1 text-2xl font-bold">{counts.pending}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs uppercase text-zinc-500">Approved Loaded</p>
            <p className="mt-1 text-2xl font-bold">{counts.approved}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-xs uppercase text-zinc-500">Rejected Loaded</p>
            <p className="mt-1 text-2xl font-bold">{counts.rejected}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex min-w-40 flex-col gap-2 text-xs text-zinc-500">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ReleaseCandidateStatus | 'all')}
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-40 flex-col gap-2 text-xs text-zinc-500">
            Platform
            <select
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value)}
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
            >
              {PLATFORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filteredCandidates.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">
          No candidates in this view. Run the source crawler or switch status.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCandidates.map((candidate) => {
            const draft = { ...candidate, ...editing[candidate.id] }
            const signalText = getSignalText(candidate)
            const metadataBadges = getMetadataBadges(candidate)
            const dirty = Boolean(editing[candidate.id])

            return (
              <section
                key={candidate.id}
                data-testid={`release-candidate-${candidate.id}`}
                className="grid gap-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4 lg:grid-cols-[240px_1fr_180px]"
              >
                <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-zinc-800 bg-zinc-900 lg:sticky lg:top-4">
                  {candidate.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={candidate.image_url}
                      alt=""
                      onError={(event) => {
                        if (event.currentTarget.src !== IMAGE_FALLBACK_DATA_URL) {
                          event.currentTarget.src = IMAGE_FALLBACK_DATA_URL
                        }
                      }}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                      No image
                    </div>
                  )}
                </div>

                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{candidate.source}</Badge>
                    <Badge variant="secondary">{candidate.status}</Badge>
                    <span className="text-sm font-semibold text-emerald-300">
                      {candidate.confidence_score}/100
                    </span>
                    {candidate.release_date_precision !== 'exact' && (
                      <span className="text-xs text-amber-300">
                        {candidate.release_date_precision} date
                      </span>
                    )}
                    {metadataBadges.map((badge) => (
                      <Badge key={badge} variant="outline" className="border-zinc-700 text-zinc-300">
                        {badge}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1 text-xs text-zinc-500 md:col-span-2">
                      Title
                      <Input
                        value={draft.title ?? ''}
                        onChange={(event) =>
                          patchCandidate(candidate.id, { title: event.target.value })
                        }
                        className="border-zinc-800 bg-zinc-900 text-white"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-zinc-500">
                      Developer
                      <Input
                        value={draft.developer ?? ''}
                        onChange={(event) =>
                          patchCandidate(candidate.id, { developer: event.target.value })
                        }
                        className="border-zinc-800 bg-zinc-900 text-white"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-zinc-500">
                      Platforms
                      <Input
                        value={platformsToText(draft.platforms ?? [])}
                        onChange={(event) =>
                          patchCandidate(candidate.id, {
                            platforms: textToPlatforms(event.target.value),
                          })
                        }
                        className="border-zinc-800 bg-zinc-900 text-white"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-zinc-500">
                      Release date
                      <Input
                        type="date"
                        value={draft.release_date ?? ''}
                        onChange={(event) =>
                          patchCandidate(candidate.id, {
                            release_date: event.target.value || undefined,
                            release_date_precision: event.target.value ? 'exact' : 'unknown',
                          })
                        }
                        className="border-zinc-800 bg-zinc-900 text-white"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-zinc-500">
                      Confidence
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={draft.confidence_score ?? 0}
                        onChange={(event) =>
                          patchCandidate(candidate.id, {
                            confidence_score: Number(event.target.value),
                          })
                        }
                        className="border-zinc-800 bg-zinc-900 text-white"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-zinc-500 md:col-span-2">
                      Description
                      <Textarea
                        value={draft.description ?? ''}
                        onChange={(event) =>
                          patchCandidate(candidate.id, { description: event.target.value })
                        }
                        className="border-zinc-800 bg-zinc-900 text-white"
                      />
                    </label>
                  </div>

                  {signalText && <p className="text-xs text-zinc-500">{signalText}</p>}
                  <a
                    href={candidate.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-xs text-indigo-300 hover:text-indigo-200"
                  >
                    {candidate.source_url}
                  </a>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    disabled={!dirty}
                    onClick={() => saveCandidate(candidate)}
                  >
                    Save
                  </Button>
                  <Button
                    disabled={candidate.status === 'approved'}
                    onClick={() => review(candidate, 'approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    disabled={candidate.status === 'rejected'}
                    onClick={() => review(candidate, 'reject')}
                  >
                    Reject
                  </Button>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </main>
  )
}
