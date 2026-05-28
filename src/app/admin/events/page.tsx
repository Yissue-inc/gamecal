'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { adminFetch } from '@/lib/admin-fetch'
import type { GameEvent, RewardRarity, RewardType, SourceConfidence } from '@/types'
import { toast } from 'sonner'

const REWARD_TYPES: Array<{ value: RewardType; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'skin', label: 'Skin / cosmetic' },
  { value: 'currency', label: 'Currency / resource' },
  { value: 'xp_boost', label: 'XP boost' },
  { value: 'item', label: 'Item reward' },
  { value: 'character', label: 'Character' },
  { value: 'banner', label: 'Banner / gacha' },
  { value: 'raid_drop', label: 'Raid / loot drop' },
  { value: 'login_bonus', label: 'Login bonus' },
  { value: 'tournament_prize', label: 'Tournament / drops' },
  { value: 'progression', label: 'Progression reset' },
  { value: 'content', label: 'Content unlock' },
]

const REWARD_RARITIES: Array<{ value: RewardRarity; label: string }> = [
  { value: 'common', label: 'Common' },
  { value: 'limited', label: 'Limited' },
  { value: 'premium', label: 'Premium' },
  { value: 'time_limited', label: 'Time limited' },
]

const SOURCE_CONFIDENCES: Array<{ value: SourceConfidence; label: string }> = [
  { value: 'official', label: 'Official' },
  { value: 'media', label: 'Media' },
  { value: 'inferred', label: 'Inferred' },
]

type RewardDraft = Pick<
  GameEvent,
  | 'reward_type'
  | 'reward_summary'
  | 'reward_rarity'
  | 'reward_score'
  | 'is_time_limited_reward'
  | 'source_confidence'
>

function makeRewardDraft(event: GameEvent): RewardDraft {
  return {
    reward_type: event.reward_type ?? 'none',
    reward_summary: event.reward_summary ?? '',
    reward_rarity: event.reward_rarity ?? 'common',
    reward_score: event.reward_score ?? 0,
    is_time_limited_reward: event.is_time_limited_reward ?? false,
    source_confidence: event.source_confidence ?? 'inferred',
  }
}

function rewardTypeLabel(type?: RewardType) {
  return REWARD_TYPES.find((item) => item.value === type)?.label ?? 'None'
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rewardDrafts, setRewardDrafts] = useState<Record<string, RewardDraft>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ game: 'all' })
    if (dateFrom) params.set('start', new Date(dateFrom).toISOString())
    if (dateTo) params.set('end', new Date(dateTo).toISOString())
    const res = await adminFetch(`/api/events?${params}`)
    const data = await res.json()
    setEvents(data.events ?? [])
    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = filter.toLowerCase()
    if (!q) return events
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.game?.name?.toLowerCase().includes(q) ||
        e.event_type.toLowerCase().includes(q)
    )
  }, [events, filter])

  const togglePublish = async (event: GameEvent) => {
    const res = await adminFetch(`/api/events/${event.id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_published: !event.is_published }),
    })
    if (res.ok) {
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, is_published: !e.is_published } : e))
      )
      toast.success(event.is_published ? 'Unpublished' : 'Published')
    } else {
      toast.error('Update failed')
    }
  }

  const openRewardEditor = (event: GameEvent) => {
    setExpandedId((current) => (current === event.id ? null : event.id))
    setRewardDrafts((prev) => ({
      ...prev,
      [event.id]: prev[event.id] ?? makeRewardDraft(event),
    }))
  }

  const patchRewardDraft = (eventId: string, patch: Partial<RewardDraft>) => {
    setRewardDrafts((prev) => ({
      ...prev,
      [eventId]: { ...prev[eventId], ...patch },
    }))
  }

  const saveReward = async (event: GameEvent) => {
    const draft = rewardDrafts[event.id] ?? makeRewardDraft(event)
    const payload = {
      reward_type: draft.reward_type,
      reward_summary: draft.reward_summary?.trim() || null,
      reward_rarity: draft.reward_rarity,
      reward_score: Math.max(0, Math.min(100, Number(draft.reward_score ?? 0))),
      is_time_limited_reward: Boolean(draft.is_time_limited_reward),
      source_confidence: draft.source_confidence,
    }

    setSavingId(event.id)
    const res = await adminFetch(`/api/events/${event.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    setSavingId(null)

    if (res.ok) {
      const updated = { ...event, ...payload } as GameEvent
      setEvents((prev) => prev.map((item) => (item.id === event.id ? updated : item)))
      setRewardDrafts((prev) => ({ ...prev, [event.id]: makeRewardDraft(updated) }))
      toast.success('Reward signal saved')
    } else {
      toast.error(data.error ?? 'Reward update failed')
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} events</p>
        </div>
        <Input
          placeholder="Search title, game, type…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs border-zinc-700 bg-zinc-900"
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-auto border-zinc-700 bg-zinc-900"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-auto border-zinc-700 bg-zinc-900"
        />
        <Button variant="outline" size="sm" onClick={load}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-4 py-2 text-left">Game</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Importance</th>
                <th className="px-4 py-2 text-left">Reward</th>
                <th className="px-4 py-2 text-left">Published</th>
                <th className="px-4 py-2 text-left">Edit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const draft = rewardDrafts[e.id] ?? makeRewardDraft(e)
                const expanded = expandedId === e.id

                return (
                  <>
                    <tr key={e.id} className="border-t border-zinc-800">
                      <td className="px-4 py-2">{e.game?.name ?? '—'}</td>
                      <td className="px-4 py-2">{e.event_type}</td>
                      <td className="max-w-[240px] truncate px-4 py-2">{e.title}</td>
                      <td className="whitespace-nowrap px-4 py-2">
                        {new Date(e.start_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="secondary">{e.importance}</Badge>
                      </td>
                      <td className="min-w-[180px] px-4 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={e.reward_score && e.reward_score >= 70 ? 'default' : 'outline'}
                            className={e.reward_score && e.reward_score >= 70 ? 'bg-amber-500 text-black' : ''}
                          >
                            {e.reward_score ?? 0}
                          </Badge>
                          <span className="max-w-[180px] truncate text-xs text-zinc-400">
                            {e.reward_summary || rewardTypeLabel(e.reward_type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Switch
                          checked={e.is_published}
                          onCheckedChange={() => togglePublish(e)}
                          aria-label={`Publish ${e.title}`}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          data-testid={`edit-reward-${e.id}`}
                          onClick={() => openRewardEditor(e)}
                        >
                          {expanded ? 'Close' : 'Reward'}
                        </Button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`${e.id}-reward`} className="border-t border-zinc-800 bg-zinc-950/80">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
                            <label className="space-y-1 text-xs text-zinc-500 lg:col-span-2">
                              Reward summary
                              <Textarea
                                value={draft.reward_summary ?? ''}
                                onChange={(event) =>
                                  patchRewardDraft(e.id, { reward_summary: event.target.value })
                                }
                                placeholder="e.g. Limited skin reward, Double XP, Primogems login bonus"
                                className="min-h-20 border-zinc-800 bg-zinc-900 text-white"
                              />
                            </label>
                            <label className="space-y-1 text-xs text-zinc-500">
                              Reward type
                              <select
                                value={draft.reward_type ?? 'none'}
                                onChange={(event) =>
                                  patchRewardDraft(e.id, { reward_type: event.target.value as RewardType })
                                }
                                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
                              >
                                {REWARD_TYPES.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="space-y-1 text-xs text-zinc-500">
                              Rarity
                              <select
                                value={draft.reward_rarity ?? 'common'}
                                onChange={(event) =>
                                  patchRewardDraft(e.id, { reward_rarity: event.target.value as RewardRarity })
                                }
                                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
                              >
                                {REWARD_RARITIES.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="space-y-1 text-xs text-zinc-500">
                              Score
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={draft.reward_score ?? 0}
                                onChange={(event) =>
                                  patchRewardDraft(e.id, { reward_score: Number(event.target.value) })
                                }
                                className="border-zinc-800 bg-zinc-900 text-white"
                              />
                            </label>
                            <div className="flex flex-col gap-3">
                              <label className="space-y-1 text-xs text-zinc-500">
                                Source confidence
                                <select
                                  value={draft.source_confidence ?? 'inferred'}
                                  onChange={(event) =>
                                    patchRewardDraft(e.id, {
                                      source_confidence: event.target.value as SourceConfidence,
                                    })
                                  }
                                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
                                >
                                  {SOURCE_CONFIDENCES.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                                Time-limited
                                <Switch
                                  checked={Boolean(draft.is_time_limited_reward)}
                                  onCheckedChange={(checked) =>
                                    patchRewardDraft(e.id, { is_time_limited_reward: checked })
                                  }
                                />
                              </label>
                              <Button
                                type="button"
                                disabled={savingId === e.id}
                                data-testid={`save-reward-${e.id}`}
                                onClick={() => saveReward(e)}
                              >
                                {savingId === e.id ? 'Saving...' : 'Save Reward'}
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
