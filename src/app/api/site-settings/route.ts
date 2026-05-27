import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'

const DEFAULT_SETTINGS = {
  show_cinematic_intro: true,
  show_signup_onboarding: true,
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ settings: DEFAULT_SETTINGS })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('site_settings')
      .select('value')
      .eq('key', 'public_ui')
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ settings: { ...DEFAULT_SETTINGS, ...(data?.value ?? {}) } })
  } catch {
    return NextResponse.json({ settings: DEFAULT_SETTINGS })
  }
}
