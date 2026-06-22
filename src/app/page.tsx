import { Suspense } from 'react'
import { CalendarLayout } from '@/components/calendar/CalendarLayout'
import { MOCK_GAMES } from '@/lib/mock-data'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/server'
import { appendWorldCupGame } from '@/lib/world-cup'
import type { Game } from '@/types'

async function getGames(): Promise<Game[]> {
  if (!isSupabaseConfigured()) return appendWorldCupGame(MOCK_GAMES)

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error || !data?.length) return appendWorldCupGame(MOCK_GAMES)
    return appendWorldCupGame(data as Game[])
  } catch {
    return appendWorldCupGame(MOCK_GAMES)
  }
}

export default async function HomePage() {
  const games = await getGames()
  return (
    <>
      <section className="sr-only" aria-label="GamerClock overview">
        <h1>GamerClock gaming event calendar</h1>
        <p>
          GamerClock tracks live game events, weekly resets, limited-time rewards, esports fixtures,
          new game releases, and Summer Cup 2026 ROAR matches in one calendar.
        </p>
        <p>
          Players can follow Fortnite, World of Warcraft, Pokemon GO, Genshin Impact,
          League of Legends, and Summer Cup 2026 schedules, then save reminders or play ROAR
          for selected match fixtures.
        </p>
      </section>
      <Suspense fallback={null}>
        <CalendarLayout games={games} />
      </Suspense>
    </>
  )
}
