import { NextRequest, NextResponse } from 'next/server'
import { crawlReleaseCandidates } from '@/lib/crawlers/release-candidates'
import { verifyAdminSecret } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const source = typeof body.source === 'string' ? body.source : 'all'

  try {
    const result = await crawlReleaseCandidates(source)
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Release crawl failed' },
      { status: 500 }
    )
  }
}
