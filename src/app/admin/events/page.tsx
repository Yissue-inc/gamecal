'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { adminFetch } from '@/lib/admin-fetch'
import type { GameEvent } from '@/types'
import { toast } from 'sonner'

export default function AdminEventsPage() {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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
                <th className="px-4 py-2 text-left">Published</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-zinc-800">
                  <td className="px-4 py-2">{e.game?.name ?? '—'}</td>
                  <td className="px-4 py-2">{e.event_type}</td>
                  <td className="max-w-[240px] truncate px-4 py-2">{e.title}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {new Date(e.start_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="secondary">{e.importance}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Switch
                      checked={e.is_published}
                      onCheckedChange={() => togglePublish(e)}
                      aria-label={`Publish ${e.title}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
