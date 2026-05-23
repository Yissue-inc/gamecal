import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const GAMES = [
  { slug: 'fortnite', name: 'Fortnite', brand_color: '#00d4ff', platform: ['PC', 'PS5', 'Xbox', 'Mobile', 'Switch'], sort_order: 1 },
  { slug: 'wow', name: 'World of Warcraft', brand_color: '#f59e0b', platform: ['PC'], sort_order: 2 },
  { slug: 'pokemon-go', name: 'Pokémon GO', brand_color: '#ffcc00', platform: ['Mobile'], sort_order: 3 },
  { slug: 'genshin', name: 'Genshin Impact', brand_color: '#4ade80', platform: ['PC', 'PS5', 'Mobile'], sort_order: 4 },
  { slug: 'lol', name: 'League of Legends', brand_color: '#c89b3c', platform: ['PC'], sort_order: 5 },
]

async function seed() {
  console.log('Seeding GAMECAL database...')

  for (const game of GAMES) {
    const { error } = await supabase.from('games').upsert(game, { onConflict: 'slug' })
    if (error) console.error(`Game ${game.slug}:`, error.message)
    else console.log(`✓ Game: ${game.name}`)
  }

  const { data: games } = await supabase.from('games').select('id, slug')
  const gameMap = Object.fromEntries((games ?? []).map((g) => [g.slug, g.id]))

  const events = [
    { slug: 'fortnite', title: 'Weekly Quests Reset', event_type: 'weekly_reset', importance: 'high', start_at: '2026-05-28T09:00:00Z', end_at: '2026-06-04T08:59:00Z' },
    { slug: 'fortnite', title: 'Summer Splash Event', event_type: 'live_event', importance: 'high', start_at: '2026-06-20T00:00:00Z', end_at: '2026-07-10T23:59:00Z', description: 'Summer themed event' },
    { slug: 'fortnite', title: 'Fortnite Season End', event_type: 'season_end', importance: 'critical', start_at: '2026-06-13T02:00:00Z' },
    { slug: 'fortnite', title: 'Today Event Demo', event_type: 'limited_reward', importance: 'high', start_at: '2026-05-22T14:00:00Z', end_at: '2026-05-22T20:00:00Z', description: 'Demo event for today' },
    { slug: 'wow', title: 'Weekly Reset', event_type: 'weekly_reset', importance: 'high', start_at: '2026-05-26T15:00:00Z', end_at: '2026-06-02T14:59:00Z' },
    { slug: 'wow', title: 'Midsummer Fire Festival', event_type: 'live_event', importance: 'high', start_at: '2026-06-21T10:00:00Z', end_at: '2026-07-05T23:59:00Z' },
    { slug: 'wow', title: 'WoW Patch 11.2 Release', event_type: 'patch_release', importance: 'critical', start_at: '2026-06-09T15:00:00Z' },
    { slug: 'pokemon-go', title: 'Community Day June', event_type: 'live_event', importance: 'critical', start_at: '2026-06-21T14:00:00Z', end_at: '2026-06-21T17:00:00Z' },
    { slug: 'pokemon-go', title: 'GO Fest 2026', event_type: 'live_event', importance: 'critical', start_at: '2026-07-11T10:00:00Z', end_at: '2026-07-12T20:00:00Z' },
    { slug: 'genshin', title: 'Version 5.7 Update', event_type: 'new_content', importance: 'critical', start_at: '2026-05-28T06:00:00Z' },
    { slug: 'genshin', title: 'Summer Event 2026', event_type: 'live_event', importance: 'high', start_at: '2026-06-15T00:00:00Z', end_at: '2026-07-07T23:59:00Z' },
    { slug: 'lol', title: 'Patch 16.11 — Balance Update', event_type: 'patch_release', importance: 'high', start_at: '2026-05-27T14:00:00Z' },
    { slug: 'lol', title: 'Night Market Opens', event_type: 'limited_reward', importance: 'high', start_at: '2026-06-05T00:00:00Z', end_at: '2026-06-19T23:59:00Z', description: 'Exclusive skins available' },
    { slug: 'lol', title: 'MSI 2026 — Finals', event_type: 'tournament', importance: 'critical', start_at: '2026-06-20T12:00:00Z', end_at: '2026-06-20T18:00:00Z' },
  ]

  let count = 0
  for (const e of events) {
    const game_id = gameMap[e.slug]
    if (!game_id) continue
    const { slug: _s, ...rest } = e
    const { error } = await supabase.from('events').insert({
      ...rest,
      game_id,
      source_url: `https://gamecal.io/${e.slug}`,
      is_published: true,
    })
    if (error && !error.message.includes('duplicate')) {
      console.error(`Event ${e.title}:`, error.message)
    } else {
      count++
    }
  }
  console.log(`✓ Inserted ${count} events`)

  const releases = [
    { title: 'Hollow Knight: Silksong', developer: 'Team Cherry', platform: ['Switch', 'PC'], release_date: '2026-06-15', is_featured: true, is_published: true },
    { title: 'Metroid Prime 4', developer: 'Nintendo', platform: ['Switch'], release_date: '2026-07-01', is_featured: true, is_published: true },
    { title: 'Elden Ring: Nightreign', developer: 'FromSoftware', platform: ['PC', 'PS5', 'Xbox'], release_date: '2026-05-30', is_featured: true, is_published: true },
  ]

  for (const r of releases) {
    const { error } = await supabase.from('new_releases').insert(r)
    if (error) console.error(`Release ${r.title}:`, error.message)
    else console.log(`✓ Release: ${r.title}`)
  }

  console.log('Seed complete!')
}

seed().catch(console.error)
