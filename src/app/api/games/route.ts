import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MOCK_GAMES, isSupabaseConfigured } from '@/lib/mock-data'

const PUBLIC_GAMES_CACHE = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ games: MOCK_GAMES }, { headers: PUBLIC_GAMES_CACHE })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ games: data }, { headers: PUBLIC_GAMES_CACHE })
}
