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

const heroColors: Record<string, string> = {
  'Hollow Knight: Silksong': '#1a1a2e',
  'Metroid Prime 4': '#e4000f',
  'Elden Ring: Nightreign': '#1b2838',
  'Borderlands 4': '#f59e0b',
}

async function seed() {
  for (const [title, hero_color] of Object.entries(heroColors)) {
    const keyword = title.split(':')[0] ?? title
    const { data, error } = await supabase
      .from('new_releases')
      .update({ hero_color })
      .ilike('title', `%${keyword}%`)
      .select('id, title')

    if (error) {
      console.error(`❌ ${title}`, error.message)
      continue
    }
    if (!data?.length) {
      console.warn(`⚠️  No rows matched: ${title}`)
      continue
    }
    for (const row of data) {
      console.log(`✅ ${row.title} → ${hero_color}`)
    }
  }
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
