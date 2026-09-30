import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end config for the Agendya Backoffice frontend.
 *
 * Stubs the Backoffice API (apps/backoffice-api) at the network boundary —
 * see tests/e2e/login-and-tickets.spec.ts — so the route tree, its own auth
 * store, and role-gated UI are under test without needing Postgres or a
 * running backend.
 *
 * Env overrides:
 *   E2E_PORT       dev-server / baseURL port          (default 5174)
 *   E2E_BASE_URL   full base URL                      (default http://localhost:<port>)
 *   E2E_API_URL    origin the app calls for the API   (default http://localhost:4001)
 */
const PORT = Number(process.env.E2E_PORT ?? 5174);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120_000,
  },
});
