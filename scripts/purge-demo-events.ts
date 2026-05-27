import { createClient } from '@supabase/supabase-js'

const ws = require('ws')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
  realtime: { transport: ws },
})

async function main() {
  const { data, error } = await supabase
    .from('events')
    .delete()
    .ilike('source_url', '%gamecal.io%')
    .select('id')

  if (error) throw error
  console.log(`Deleted ${data?.length ?? 0} demo events with gamecal.io source_url.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
