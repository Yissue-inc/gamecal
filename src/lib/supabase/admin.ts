import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const WebSocketTransport = ws as unknown as typeof WebSocket

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: WebSocketTransport },
    }
  )
}
