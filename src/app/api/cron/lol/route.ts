import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/utils'
import { crawlLol } from '@/lib/crawlers/lol'

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await crawlLol()
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
