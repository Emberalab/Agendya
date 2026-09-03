import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Where `auth.setup.ts` writes the authenticated storage state and where
 * dashboard specs read it from (`test.use({ storageState: STORAGE_STATE })`).
 */
export const STORAGE_STATE = path.join(
  here,
  '..',
  '..',
  'playwright',
  '.auth',
  'user.json',
);
