import { expect, test } from '../../fixtures/test';

/**
 * Exercises the real `prefers-color-scheme` media query (via Playwright's
 * `page.emulateMedia`) end to end, complementing the mocked-`matchMedia`
 * coverage in `src/shared/theme/themeStore.test.ts`.
 */
test.describe('theme follows the OS preference', () => {
  test('uses the light theme when the OS prefers light and no manual choice was made', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/login');

    await expect(page.locator('html')).not.toHaveAttribute(
      'data-theme',
      'dark',
    );
  });

  test('uses the dark theme when the OS prefers dark and no manual choice was made', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/login');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('a manual light choice overrides a dark OS preference', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'agendya-theme',
        JSON.stringify({ state: { manualTheme: 'light' }, version: 0 }),
      );
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/login');

    await expect(page.locator('html')).not.toHaveAttribute(
      'data-theme',
      'dark',
    );
  });

  test('a manual dark choice overrides a light OS preference', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'agendya-theme',
        JSON.stringify({ state: { manualTheme: 'dark' }, version: 0 }),
      );
    });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/login');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('reacts live when the OS preference changes and no manual choice was made', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/login');
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-theme',
      'dark',
    );

    await page.emulateMedia({ colorScheme: 'dark' });

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('ignores a live OS preference change once a manual choice has been made', async ({
    page,
  }) => {
    // Seeded the same way clicking the toggle would persist it — toggle-click
    // coverage already lives in navigation/dashboard-nav.spec.ts; this test
    // is about the live-reactivity guard, not the toggle UI itself.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'agendya-theme',
        JSON.stringify({ state: { manualTheme: 'dark' }, version: 0 }),
      );
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/login');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Flip the OS the other way — the explicit choice above must stick.
    await page.emulateMedia({ colorScheme: 'light' });

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
