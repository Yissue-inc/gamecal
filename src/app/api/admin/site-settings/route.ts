import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { verifyAdminSecret } from '@/lib/utils'
import {
  DEFAULT_PUBLIC_UI_SETTINGS,
  mergePublicUiSettings,
  sanitizePublicUiSettings,
} from '@/lib/public-ui-settings'

export async function GET(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ settings: DEFAULT_PUBLIC_UI_SETTINGS })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('site_settings')
      .select('value')
      .eq('key', 'public_ui')
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ settings: mergePublicUiSettings(data?.value ?? {}) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load settings'
    return NextResponse.json({
      settings: DEFAULT_PUBLIC_UI_SETTINGS,
      needsMigration: true,
      warning: message,
    })
  }
}

export async function PUT(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const settings = sanitizePublicUiSettings(body)

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ settings })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('site_settings')
    .upsert(
      {
        key: 'public_ui',
        value: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
    .select('value')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data.value })
}
