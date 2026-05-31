import { defineConfig, devices } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'

function loadLocalEnv() {
  if (!existsSync('.env.local')) return

  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && !process.env[key]) process.env[key] = value
  }
}

loadLocalEnv()

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001'
const storageStateSlug = Buffer.from(new URL(baseURL).origin)
  .toString('base64url')
  .replace(/=+$/g, '')

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 2,
  workers: 1,
  fullyParallel: false,
  reporter: [['html'], ['list']],
  globalSetup: './tests/global-setup.ts',
  outputDir: 'test-results/',
  snapshotPathTemplate: '{testDir}/snapshots/{testFilePath}/{arg}{ext}',
  use: {
    baseURL,
    storageState: `test-results/.auth/no-intro-${storageStateSlug}.json`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
})
