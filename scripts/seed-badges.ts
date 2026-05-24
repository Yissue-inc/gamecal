/**
 * Seed badge definitions into Supabase (run when DATABASE_URL is configured).
 * Local MVP uses BADGE_DEFINITIONS in engagement-store.ts.
 */
import { BADGE_DEFINITIONS } from '../src/lib/engagement-store'

async function main() {
  console.log('Badge definitions (local MVP):')
  for (const b of BADGE_DEFINITIONS) {
    console.log(`  ${b.id}: ${b.name} (${b.rarity})`)
  }
  console.log('\nApply supabase/migrations/004_engagement.sql for DB-backed badges.')
}

main()
