import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { DEFAULT_PUBLIC_UI_SETTINGS, mergePublicUiSettings } from '@/lib/public-ui-settings'

const PUBLIC_SETTINGS_CACHE = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ settings: DEFAULT_PUBLIC_UI_SETTINGS }, { headers: PUBLIC_SETTINGS_CACHE })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('site_settings')
      .select('value')
      .eq('key', 'public_ui')
      .maybeSingle()

    if (error) throw error
    return NextResponse.json(
      { settings: mergePublicUiSettings(data?.value ?? {}) },
      { headers: PUBLIC_SETTINGS_CACHE }
    )
  } catch {
    return NextResponse.json({ settings: DEFAULT_PUBLIC_UI_SETTINGS }, { headers: PUBLIC_SETTINGS_CACHE })
  }
}
