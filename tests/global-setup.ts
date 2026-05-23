export default async function globalSetup() {
  const required = ['PLAYWRIGHT_BASE_URL', 'TEST_USER_EMAIL', 'TEST_USER_PASSWORD']
  const missing = required.filter((k) => !process.env[k])
  if (missing.length) {
    console.warn(`[global-setup] Missing env vars: ${missing.join(', ')} — auth tests may be skipped`)
  }
}
