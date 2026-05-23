'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { GameEvent } from '@/types'

export default function AdminEventsPage() {
  const [events, setEvents] = useState<GameEvent[]>([])

  useEffect(() => {
    fetch('/api/events?game=all')
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
  }, [])

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Events</h1>
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
            {events.map((e) => (
              <tr key={e.id} className="border-t border-zinc-800">
                <td className="px-4 py-2">{e.game?.name}</td>
                <td className="px-4 py-2">{e.event_type}</td>
                <td className="px-4 py-2">{e.title}</td>
                <td className="px-4 py-2">{new Date(e.start_at).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <Badge variant="secondary">{e.importance}</Badge>
                </td>
                <td className="px-4 py-2">{e.is_published ? '✓' : '✗'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Use POST /api/events with Authorization header to add events via API.
      </p>
    </main>
  )
}
