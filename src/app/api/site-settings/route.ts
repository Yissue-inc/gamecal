import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { DEFAULT_PUBLIC_UI_SETTINGS, mergePublicUiSettings } from '@/lib/public-ui-settings'

export async function GET() {
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
  } catch {
    return NextResponse.json({ settings: DEFAULT_PUBLIC_UI_SETTINGS })
  }
}
