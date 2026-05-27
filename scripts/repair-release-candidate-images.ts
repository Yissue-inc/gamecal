if (!globalThis.WebSocket) {
  globalThis.WebSocket = require('ws')
}

async function main() {
  const { repairReleaseCandidateImages } = await import('@/lib/crawlers/release-candidates')
  const status = process.argv[2] ?? 'pending'
  const limit = Number(process.argv[3] ?? 200)
  const result = await repairReleaseCandidateImages(status, limit)
  console.log(
    `release-candidate-images: checked=${result.checked}, repaired=${result.repaired}, skipped=${result.skipped}, failed=${result.failed}`
  )
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})

export {}
