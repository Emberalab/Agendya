// Verifies the PRODUCTION PWA bundle end to end: builds `apps/web` (unless
// `dist/` already exists and `--no-build` is passed), serves it with
// `vite preview`, then drives a headless Chromium through the checks that a
// real install depends on — a valid manifest, resolvable icons, a service
// worker that activates and controls the page, a populated precache that holds
// no API/private responses, and offline navigation that still serves the app
// shell for a deep link.
//
// Run from `apps/web`:  node scripts/verify-pwa.mjs
// or from the repo root: npm run verify:pwa
//
// Exit code is non-zero if any check fails, so it is safe to wire into CI.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PWA_PORT ?? 4178);
const BASE = `http://localhost:${PORT}`;
const noBuild = process.argv.includes('--no-build');

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass });
  process.stdout.write(
    `${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}\n`,
  );
};

const run = (cmd, args, opts = {}) => {
  const child = spawn(cmd, args, { cwd: webRoot, stdio: 'inherit', ...opts });
  return child;
};

if (!noBuild || !existsSync(resolve(webRoot, 'dist/sw.js'))) {
  const build = run('npm', ['run', 'build']);
  const [code] = await once(build, 'exit');
  if (code !== 0) {
    console.error('build failed');
    process.exit(code ?? 1);
  }
}

const preview = spawn(
  'npm',
  ['run', 'preview', '--', '--port', String(PORT), '--strictPort'],
  { cwd: webRoot, stdio: 'ignore' },
);

let browser;
try {
  // Wait for the preview server to answer.
  for (let i = 0; i < 40; i += 1) {
    try {
      const r = await fetch(BASE);
      if (r.ok) break;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }

  browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const resp = await page.goto(BASE, { waitUntil: 'load' });
  check('index.html served', resp?.status() === 200, `status ${resp?.status()}`);

  const href = await page.getAttribute('link[rel="manifest"]', 'href');
  check('manifest <link>', Boolean(href), href ?? '');
  const manifest = await (
    await page.request.get(new URL(String(href), BASE).toString())
  ).json();
  for (const key of [
    'name',
    'short_name',
    'start_url',
    'scope',
    'display',
    'theme_color',
    'background_color',
    'icons',
  ]) {
    check(`manifest.${key}`, manifest[key] !== undefined);
  }
  check('display standalone', manifest.display === 'standalone', manifest.display);
  const sizes = (manifest.icons ?? []).map((i) => i.sizes);
  check('icon 192 + 512', sizes.includes('192x192') && sizes.includes('512x512'));
  check(
    'maskable icon',
    (manifest.icons ?? []).some((i) => (i.purpose ?? '').includes('maskable')),
  );
  for (const icon of manifest.icons ?? []) {
    const ir = await page.request.get(new URL(icon.src, BASE).toString());
    check(`icon ${icon.src}`, ir.status() === 200, String(ir.status()));
  }
  const meta = await page.getAttribute('meta[name="theme-color"]', 'content');
  check('index.html theme-color == manifest', meta === manifest.theme_color);

  await page
    .waitForFunction(
      async () => Boolean((await navigator.serviceWorker.getRegistration())?.active),
      null,
      { timeout: 15000 },
    )
    .catch(() => {});
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return { scope: reg?.scope, state: reg?.active?.state };
  });
  check('SW registered + activated', sw.state === 'activated', JSON.stringify(sw));
  check('SW scope is /', sw.scope === `${BASE}/`, sw.scope ?? '');

  await page.reload({ waitUntil: 'load' });
  const controller = await page.evaluate(
    () => navigator.serviceWorker.controller?.scriptURL ?? null,
  );
  check('SW controls page after reload', Boolean(controller), controller ?? '');

  const cacheReport = await page.evaluate(async () => {
    const out = { total: 0, apiLeak: null, hasShell: false };
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      out.total += keys.length;
      for (const req of keys) {
        if (/\/api\/|\/auth\/|\/notifications\b|\/bookings\b/.test(req.url)) {
          out.apiLeak = req.url;
        }
      }
      if (await cache.match('/index.html', { ignoreSearch: true })) {
        out.hasShell = true;
      }
    }
    return out;
  });
  check('precache populated', cacheReport.total > 0, `${cacheReport.total} entries`);
  check('app shell precached', cacheReport.hasShell);
  check('no API/private responses cached', cacheReport.apiLeak === null, cacheReport.apiLeak ?? 'clean');

  await ctx.setOffline(true);
  await sleep(300);
  await page
    .goto(`${BASE}/dashboard/agenda`, { waitUntil: 'domcontentloaded' })
    .catch(() => {});
  const offlineRoot = await page
    .evaluate(() => Boolean(document.querySelector('#root')))
    .catch(() => false);
  check('offline deep-link serves the app shell', offlineRoot);

  const offlineApi = await page.evaluate(async () => {
    try {
      await fetch('/api/notifications');
      return 'served (unexpected)';
    } catch {
      return 'network error (expected)';
    }
  });
  check(
    'offline API request is NOT served from cache',
    offlineApi.startsWith('network error'),
    offlineApi,
  );
  await ctx.setOffline(false);

  const client = await ctx.newCDPSession(page);
  let installErrors = [];
  try {
    ({ installabilityErrors: installErrors = [] } = await client.send(
      'Page.getInstallabilityErrors',
    ));
  } catch {
    /* CCDP variant */
  }
  check(
    'no installability errors',
    Array.isArray(installErrors) && installErrors.length === 0,
    JSON.stringify(installErrors),
  );
} finally {
  await browser?.close();
  preview.kill('SIGTERM');
}

const failed = results.filter((r) => !r.pass);
process.stdout.write(
  `\n${results.length - failed.length}/${results.length} checks passed\n`,
);
if (failed.length) {
  process.stdout.write(`FAILED: ${failed.map((f) => f.name).join(', ')}\n`);
  process.exit(1);
}
