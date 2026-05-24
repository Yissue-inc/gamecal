import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
  realtime: { transport: require('ws') },
})

const BADGES = [
  { id: 'streak_3', name: 'First Timer', description: '3-day check-in streak', icon: '🔥', rarity: 'common', condition: { type: 'streak', days: 3 } },
  { id: 'streak_7', name: 'Week Warrior', description: '7-day check-in streak', icon: '🏅', rarity: 'common', condition: { type: 'streak', days: 7 } },
  { id: 'streak_30', name: 'Hardcore Regular', description: '30-day check-in streak', icon: '⚡', rarity: 'rare', condition: { type: 'streak', days: 30 } },
  { id: 'streak_100', name: 'Centurion', description: '100-day check-in streak', icon: '🛡', rarity: 'epic', condition: { type: 'streak', days: 100 } },
  { id: 'streak_365', name: 'Legend', description: '365-day check-in streak', icon: '👑', rarity: 'legendary', condition: { type: 'streak', days: 365 } },
  { id: 'special_cal_whisperer', name: "CAL's Favorite", description: 'Added your first wishlist event', icon: '🤓', rarity: 'rare', condition: { type: 'wishlist', count: 1 } },
  { id: 'special_sharer', name: 'Town Crier', description: 'Shared 10 events', icon: '📢', rarity: 'common', condition: { type: 'share', count: 10 } },
  { id: 'wishlist_5', name: 'Event Hoarder', description: 'Wishlisted 5 events', icon: '💝', rarity: 'common', condition: { type: 'wishlist', count: 5 } },
  { id: 'wishlist_25', name: 'Calendar Curator', description: 'Wishlisted 25 events', icon: '📅', rarity: 'rare', condition: { type: 'wishlist', count: 25 } },
  { id: 'checkin_30', name: 'Monthly Regular', description: '30 total check-ins', icon: '📆', rarity: 'common', condition: { type: 'total_days', days: 30 } },
  { id: 'checkin_100', name: 'Dedicated Gamer', description: '100 total check-ins', icon: '🎯', rarity: 'rare', condition: { type: 'total_days', days: 100 } },
  { id: 'game_fortnite', name: 'Fortnite Fan', description: 'Tracked 10 Fortnite events', icon: '⚡', rarity: 'common', condition: { type: 'game', slug: 'fortnite', count: 10 } },
  { id: 'game_wow', name: 'Azeroth Adventurer', description: 'Tracked 10 WoW events', icon: '🦁', rarity: 'common', condition: { type: 'game', slug: 'wow', count: 10 } },
  { id: 'game_lol', name: 'Summoner', description: 'Tracked 10 LoL events', icon: '⚔', rarity: 'common', condition: { type: 'game', slug: 'lol', count: 10 } },
  { id: 'game_genshin', name: 'Traveler', description: 'Tracked 10 Genshin events', icon: '🌀', rarity: 'common', condition: { type: 'game', slug: 'genshin', count: 10 } },
  { id: 'game_pokemon_go', name: 'Trainer', description: 'Tracked 10 Pokémon GO events', icon: '⚪', rarity: 'common', condition: { type: 'game', slug: 'pokemon-go', count: 10 } },
  { id: 'reminder_first', name: 'Never Miss', description: 'Set your first reminder', icon: '⏰', rarity: 'common', condition: { type: 'reminder', count: 1 } },
  { id: 'reminder_10', name: 'Alarm Master', description: 'Set 10 reminders', icon: '🔔', rarity: 'rare', condition: { type: 'reminder', count: 10 } },
  { id: 'onboarding_done', name: 'Fresh Start', description: 'Completed onboarding', icon: '✨', rarity: 'common', condition: { type: 'onboarding' } },
  { id: 'cinematic_seen', name: 'Opening Night', description: 'Watched the cinematic intro', icon: '🎬', rarity: 'common', condition: { type: 'cinematic' } },
  { id: 'prestige_silver', name: 'Silver Prestige', description: 'Reached 200 GP', icon: '🥈', rarity: 'common', condition: { type: 'gp', min: 200 } },
  { id: 'prestige_gold', name: 'Gold Prestige', description: 'Reached 500 GP', icon: '🥇', rarity: 'rare', condition: { type: 'gp', min: 500 } },
  { id: 'prestige_platinum', name: 'Platinum Prestige', description: 'Reached 1000 GP', icon: '💎', rarity: 'epic', condition: { type: 'gp', min: 1000 } },
  { id: 'prestige_diamond', name: 'Diamond Prestige', description: 'Reached 2500 GP', icon: '💠', rarity: 'legendary', condition: { type: 'gp', min: 2500 } },
  { id: 'early_adopter', name: 'Early Adopter', description: 'Joined during beta', icon: '🚀', rarity: 'legendary', condition: { type: 'special', id: 'early_adopter' } },
]

async function main() {
  const { error } = await supabase.from('badge_definitions').upsert(BADGES, { onConflict: 'id' })
  if (error) {
    console.error('Failed to seed badges:', error.message)
    process.exit(1)
  }
  console.log(`✅ Seeded ${BADGES.length} badge definitions`)
}

main()
