import fs from 'node:fs';
import path from 'node:path';
import { test as setup } from '@playwright/test';
import { TEST_ACCESS_TOKEN, TEST_USER } from './fixtures/data';
import { STORAGE_STATE } from './utils/auth-state';

/**
 * The app is a client-only SPA whose session lives in `localStorage` under the
 * zustand-persist key `ronda-auth`. We seed that entry directly instead of
 * driving the Google OAuth popup (which can't run headless in CI) or the email
 * login form (covered on its own in `e2e/auth/login.spec.ts`), then snapshot the
 * storage state for the dashboard specs to reuse.
 */
setup('seed an authenticated session', async ({ page }) => {
  await page.goto('/login');

  await page.evaluate(
    ({ token, user }) => {
      window.localStorage.setItem(
        'ronda-auth',
        JSON.stringify({ state: { accessToken: token, user }, version: 0 }),
      );
    },
    { token: TEST_ACCESS_TOKEN, user: TEST_USER },
  );

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE });
});
