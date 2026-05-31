import { mkdir, rename, writeFile } from 'node:fs/promises'

export default async function globalSetup() {
  const required = ['PLAYWRIGHT_BASE_URL', 'TEST_USER_EMAIL', 'TEST_USER_PASSWORD']
  const missing = required.filter((k) => !process.env[k])
  if (missing.length) {
    console.warn(`[global-setup] Missing env vars: ${missing.join(', ')} — auth tests may be skipped`)
  }

  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001'
  const origin = new URL(baseUrl).origin
  const storageStateSlug = Buffer.from(origin).toString('base64url').replace(/=+$/g, '')
  const storagePath = `test-results/.auth/no-intro-${storageStateSlug}.json`
  const tmpStoragePath = `${storagePath}.${process.pid}.tmp`

  await mkdir('test-results/.auth', { recursive: true })
  await writeFile(
    tmpStoragePath,
    JSON.stringify(
      {
        cookies: [],
        origins: [
          {
            origin,
            localStorage: [
              { name: 'gamecal-cinematic-seen', value: '1' },
              { name: 'gamecal_profile', value: JSON.stringify({ onboarding_completed: true }) },
            ],
          },
        ],
      },
      null,
      2
    )
  )
  await rename(tmpStoragePath, storagePath)
}
