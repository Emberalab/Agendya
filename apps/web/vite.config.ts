import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  server: {
    // Vite blocks unrecognized Host headers by default (CVE-2025-30208-style
    // DNS-rebinding protection). Dev-only tunnels (Cloudflare's
    // `trycloudflare.com`, ngrok's `.ngrok-free.app`/`.ngrok.io`) forward
    // requests with a Host that doesn't match localhost, so they need to be
    // allow-listed here to test the PWA/push flow on a real phone — this
    // block has no effect on `vite build`/production.
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.io'],
    // Same-origin API path so the frontend works behind an HTTPS tunnel
    // without a mixed-content block and without hardcoding the (per-run,
    // ephemeral) tunnel hostname. `apiClient.ts` routes requests through
    // `<origin>/api` whenever the page isn't served from localhost; here we
    // forward that to the Nest dev server, stripping the `/api` prefix.
    // SSE (`/api/realtime/stream`) streams through this untouched.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          // The browser stamps this same-origin POST with the tunnel's
          // `Origin` (e.g. `https://<id>.trycloudflare.com`). This hop to
          // Nest is server-to-server, and the API's CORS allowlist rejects
          // (500s) any non-localhost origin, so strip the header here — the
          // browser never sees a CORS check either way since page and
          // request share an origin.
          proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // `injectManifest` (not the default `generateSW`) because the service
      // worker carries hand-written logic — the Web Push `push` /
      // `notificationclick` handlers in `src/sw.ts`. Workbox only injects the
      // precache manifest into that file; it doesn't generate the worker.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Service worker updates itself in the background and takes over on
      // next navigation — no "new version available" prompt to build yet.
      registerType: 'autoUpdate',
      injectManifest: {
        // Default patterns already cover the SPA shell (js/css/html) and svg;
        // add the PWA icon PNGs so the app opens fully offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
      // Precache the SPA shell (HTML/JS/CSS) plus the icons themselves so
      // the app still opens (from cache) with no network, then hits the API
      // as usual for real data.
      includeAssets: [
        'favicon.svg',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: 'Agendya',
        short_name: 'Agendya',
        description:
          'Agendya es la plataforma de reservas online para barberías y peluquerías.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Matches the brand indigo used across the logo mark and UI
        // (src/imports/LogoGroup, Group11) — see also <meta name="theme-color">
        // in index.html, which must stay in sync with this value.
        theme_color: '#4F46E5',
        background_color: '#FFFFFF',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // Lets `npm run dev` register a real service worker so installability
      // (Chrome's install icon, the manifest, DevTools > Application) can be
      // checked without a production build. Safari/iOS still needs an actual
      // HTTPS deploy (or a tunnel like ngrok) to test "Add to Home Screen".
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Keep the React runtime in its own chunk: it changes far less often
        // than app code, so app deploys don't invalidate it in the browser
        // cache. Route-level code splitting (see src/routes/AppRouter.tsx) does
        // the rest of the work.
        manualChunks(id) {
          if (
            /node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(
              id,
            )
          ) {
            return 'react-vendor';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Vitest covers unit/integration specs colocated in `src/`. End-to-end specs
    // under `tests/` are Playwright's and must not be picked up here.
    exclude: [...configDefaults.exclude, 'tests/**'],
  },
});
