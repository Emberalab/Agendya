import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Vitest covers unit/integration specs colocated in `src/`. End-to-end specs
    // under `tests/` are Playwright's and must not be picked up here.
    exclude: [...configDefaults.exclude, 'tests/**'],
  },
});
