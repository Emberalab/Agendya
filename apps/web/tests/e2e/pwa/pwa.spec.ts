import { expect, test } from '@playwright/test';

/**
 * PWA installability + service-worker contract, exercised against the running
 * dev/preview server (Vite registers a real SW via `devOptions.enabled`).
 *
 * These assert user-observable behaviour — a valid manifest, an installable
 * app, a service worker that controls the page and never caches API responses —
 * not internals. Offline navigation is covered against the production bundle by
 * `scripts/verify-pwa.mjs` (`npm run verify:pwa`), which is more reliable than
 * toggling offline under Vite's dev module loader.
 */

interface ManifestIcon {
  src: string;
  sizes: string;
  purpose?: string;
}

test.describe('PWA', () => {
  test('serves a valid, installable web app manifest', async ({ page }) => {
    await page.goto('/');

    const href = await page.getAttribute('link[rel="manifest"]', 'href');
    expect(href, 'index.html links a manifest').toBeTruthy();

    const manifestUrl = new URL(String(href), page.url()).toString();
    const res = await page.request.get(manifestUrl);
    expect(res.status()).toBe(200);
    const manifest = await res.json();

    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);

    const icons: ManifestIcon[] = manifest.icons ?? [];
    const sizes = icons.map((icon) => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(
      icons.some((icon) => (icon.purpose ?? '').split(' ').includes('maskable')),
      'ships a maskable icon',
    ).toBe(true);

    // Every icon the manifest names must actually resolve.
    for (const icon of icons) {
      const iconRes = await page.request.get(
        new URL(icon.src, page.url()).toString(),
      );
      expect(iconRes.status(), icon.src + ' resolves').toBe(200);
    }

    // The browser-chrome colour in index.html must match the manifest.
    const meta = await page.getAttribute('meta[name="theme-color"]', 'content');
    expect(meta).toBe(manifest.theme_color);
  });

  test('registers a service worker scoped to the whole app', async ({
    page,
  }) => {
    await page.goto('/');

    await page.waitForFunction(
      async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        return Boolean(reg && reg.active);
      },
      null,
      { timeout: 20_000 },
    );

    const info = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return { scope: reg?.scope, state: reg?.active?.state };
    });
    expect(info.scope).toBe(new URL('/', page.url()).toString());
    expect(info.state).toBe('activated');

    // After a reload the SW controls the page. The script is `sw.js` in a
    // production build and `dev-sw.js` under `vite` dev (`devOptions.enabled`).
    await page.reload();
    const controller = await page.evaluate(
      () => navigator.serviceWorker.controller?.scriptURL ?? null,
    );
    expect(controller).toMatch(/\/(dev-)?sw\.js/);
  });

  test('never caches API or auth responses', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(
      async () => Boolean(await navigator.serviceWorker.getRegistration()),
      null,
      { timeout: 20_000 },
    );

    const leaked = await page.evaluate(async () => {
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const req of await cache.keys()) {
          if (/\/api\/|\/auth\/|\/notifications\b|\/bookings\b/.test(req.url)) {
            return req.url;
          }
        }
      }
      return null;
    });
    expect(leaked, 'no private/API response is in the SW cache').toBeNull();
  });
});
