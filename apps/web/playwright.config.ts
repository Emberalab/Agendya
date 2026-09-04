import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end config for the Agendya web app.
 *
 * The suite drives the real production bundle in a real browser, but stubs the
 * Agendya REST API at the network boundary (see `tests/fixtures/api.ts`). The
 * backend needs Postgres, applied migrations and date-sensitive seed data to
 * answer availability/agenda queries, and its own e2e suite documents a
 * serializable-transaction race; stubbing HTTP responses keeps the router,
 * TanStack Query, forms and validation fully under test without that
 * nondeterminism. Third-party services (Google OAuth, Cloudinary, Resend) are
 * never contacted.
 *
 * Env overrides:
 *   E2E_PORT       dev-server / baseURL port          (default 5173)
 *   E2E_BASE_URL   full base URL                      (default http://localhost:<port>)
 *   E2E_API_URL    origin the app calls for the API   (default http://localhost:4000)
 */
const PORT = Number(process.env.E2E_PORT ?? 5173);
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
    // Seeds an authenticated browser session into playwright/.auth/user.json.
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    // Cross-browser coverage — enable once the suite is stable in CI.
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    //   dependencies: ['setup'],
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    //   dependencies: ['setup'],
    // },
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
