import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const email = (body.email ?? '').trim().toLowerCase()

  if (!email || !email.includes('@') || !email.includes('.')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ success: true, stored: false })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('digest_subscribers')
    .upsert({ email }, { onConflict: 'email' })

  if (error) {
    // 테이블이 아직 없는 경우 gracefully 처리
    if (error.code === '42P01') {
      return NextResponse.json({ success: true, stored: false })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, stored: true })
}
