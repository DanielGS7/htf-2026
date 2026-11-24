/**
 * @file Playwright E2E config: headless Chromium against a dedicated dev server on :3200.
 * Run with `npm run e2e`. Re-seeds the DB first (e2e/global-setup.ts), runs serially.
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3200',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite dev --port 3200 --strictPort',
    url: 'http://localhost:3200/login',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { AI_DISABLED: '1' },
  },
})
