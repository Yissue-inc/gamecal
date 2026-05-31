import { mkdir, writeFile } from 'node:fs/promises'

export default async function globalSetup() {
  const required = ['PLAYWRIGHT_BASE_URL', 'TEST_USER_EMAIL', 'TEST_USER_PASSWORD']
  const missing = required.filter((k) => !process.env[k])
  if (missing.length) {
    console.warn(`[global-setup] Missing env vars: ${missing.join(', ')} — auth tests may be skipped`)
  }

  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001'
  const origin = new URL(baseUrl).origin
  const storagePath = 'test-results/.auth/no-intro.json'

  await mkdir('test-results/.auth', { recursive: true })
  await writeFile(
    storagePath,
    JSON.stringify(
      {
        cookies: [],
        origins: [
          {
            origin,
            localStorage: [{ name: 'gamecal-cinematic-seen', value: '1' }],
          },
        ],
      },
      null,
      2
    )
  )
}
