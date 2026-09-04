import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
