if (!globalThis.WebSocket) {
  globalThis.WebSocket = require('ws')
}

async function main() {
  const [
    { crawlFortnite },
    { crawlWow },
    { crawlPokemonGo },
    { crawlGenshin },
    { crawlLol },
  ] = await Promise.all([
    import('@/lib/crawlers/fortnite'),
    import('@/lib/crawlers/wow'),
    import('@/lib/crawlers/pokemon-go'),
    import('@/lib/crawlers/genshin'),
    import('@/lib/crawlers/lol'),
  ])

  const crawlers = [
    ['fortnite', crawlFortnite],
    ['wow', crawlWow],
    ['pokemon-go', crawlPokemonGo],
    ['genshin', crawlGenshin],
    ['lol', crawlLol],
  ] as const

  for (const [slug, crawl] of crawlers) {
    const result = await crawl()
    console.log(
      `${slug}: inserted=${result.inserted}, updated=${result.updated}, skipped=${result.skipped}`
    )
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
