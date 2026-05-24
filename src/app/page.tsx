import { Suspense } from 'react'
import { CalendarLayout } from '@/components/calendar/CalendarLayout'
import { MOCK_GAMES } from '@/lib/mock-data'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/server'
import type { Game } from '@/types'

async function getGames(): Promise<Game[]> {
  if (!isSupabaseConfigured()) return MOCK_GAMES

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error || !data?.length) return MOCK_GAMES
    return data as Game[]
  } catch {
    return MOCK_GAMES
  }
}

export default async function HomePage() {
  const games = await getGames()
  return (
    <Suspense fallback={null}>
      <CalendarLayout games={games} />
    </Suspense>
  )
}
