import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MOCK_EVENTS, isSupabaseConfigured } from '@/lib/mock-data'
import { verifyAdminSecret } from '@/lib/utils'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!isSupabaseConfigured()) {
    const event = MOCK_EVENTS.find((e) => e.id === id)
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ event })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select('*, game:games(*)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ event: { ...data, game: Array.isArray(data.game) ? data.game[0] : data.game } })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const admin = createAdminClient()
  const { data, error } = await admin.from('events').update(body).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('events').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
