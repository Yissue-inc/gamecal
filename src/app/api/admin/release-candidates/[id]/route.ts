import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSecret } from '@/lib/utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const allowed = [
    'title',
    'developer',
    'platforms',
    'release_date',
    'release_date_precision',
    'description',
    'image_url',
    'confidence_score',
    'signals',
  ]
  const patch = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)))

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('release_candidates')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ candidate: data })
}
