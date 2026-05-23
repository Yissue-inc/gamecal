import { NextRequest, NextResponse } from 'next/server'
import { crawlFortnite } from '@/lib/crawlers/fortnite'
import { crawlWow } from '@/lib/crawlers/wow'
import { crawlPokemonGo } from '@/lib/crawlers/pokemon-go'
import { crawlGenshin } from '@/lib/crawlers/genshin'
import { crawlLol } from '@/lib/crawlers/lol'

const CRAWLERS: Record<string, () => Promise<{ inserted: number; updated: number }>> = {
  fortnite: crawlFortnite,
  wow: crawlWow,
  'pokemon-go': crawlPokemonGo,
  genshin: crawlGenshin,
  lol: crawlLol,
}

function verifyAdminRequest(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  const headerSecret =
    request.headers.get('x-admin-secret') ||
    request.headers.get('Authorization')?.replace('Bearer ', '')
  return headerSecret === secret
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  const crawler = CRAWLERS[slug]

  if (!crawler) {
    return NextResponse.json({ error: 'Unknown game slug' }, { status: 404 })
  }

  try {
    const result = await crawler()
    return NextResponse.json({
      success: true,
      events_added: result.inserted,
      events_updated: result.updated,
      inserted: result.inserted,
      updated: result.updated,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Crawl failed' },
      { status: 500 }
    )
  }
}
