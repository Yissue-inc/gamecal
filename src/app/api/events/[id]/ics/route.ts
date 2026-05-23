import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MOCK_EVENTS, MOCK_GAMES, isSupabaseConfigured } from '@/lib/mock-data'
import { generateSingleEventICS } from '@/lib/ical'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!isSupabaseConfigured()) {
    const event = MOCK_EVENTS.find((e) => e.id === id)
    if (!event?.game) return new NextResponse('Not found', { status: 404 })
    const ics = generateSingleEventICS(event, event.game)
    return new NextResponse(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${event.title}.ics"`,
      },
    })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select('*, game:games(*)')
    .eq('id', id)
    .single()

  if (error || !data) return new NextResponse('Not found', { status: 404 })

  const game = Array.isArray(data.game) ? data.game[0] : data.game
  const ics = generateSingleEventICS(data, game)

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${data.title}.ics"`,
    },
  })
}
