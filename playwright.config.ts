import { defineConfig, devices } from '@playwright/test'

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
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
})
