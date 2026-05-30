import { NextRequest, NextResponse } from 'next/server'
import { buildLocalPartyUrl } from '@/lib/groupcal'
import type { CreatePartyPayload } from '@/lib/groupcal'

const GROUPCAL_URL = process.env.NEXT_PUBLIC_GROUPCAL_URL ?? 'https://groupcal.vercel.app'
const GROUPCAL_API_KEY = process.env.GROUPCAL_EXTERNAL_API_KEY ?? ''

function isValidPayload(value: unknown): value is CreatePartyPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<CreatePartyPayload>
  return (
    typeof payload.title === 'string' &&
    typeof payload.created_by === 'string' &&
    payload.vibe === 'game' &&
    Array.isArray(payload.options) &&
    payload.options.length >= 2
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: 'Invalid party payload' }, { status: 400 })
  }

  if (!GROUPCAL_API_KEY) {
    const slug = `gc-${crypto.randomUUID().slice(0, 8)}`
    return NextResponse.json({
      slug,
      url: buildLocalPartyUrl(request.nextUrl.origin, slug, body),
      creator_token: '',
      admin_url: '',
      fallback: true,
    })
  }

  const res = await fetch(`${GROUPCAL_URL}/api/meetings/external`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROUPCAL_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({ error: 'Invalid GroupCal response' }))
  return NextResponse.json(data, { status: res.status })
}
