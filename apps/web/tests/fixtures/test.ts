import { test as base } from '@playwright/test';
import { ApiMock } from './api';

/**
 * Every spec gets an `api` fixture: the Agendya REST API stubbed in memory and
 * installed on the page before the test body runs. Authenticated specs opt into
 * the seeded session with `test.use({ storageState: STORAGE_STATE })`.
 */
export const test = base.extend<{ api: ApiMock }>({
  // `auto: true` installs the API stub for every test, whether or not the test
  // destructures `api`. The second callback arg is Playwright's fixture-provide
  // function, named `provide` rather than the usual `use` so linters don't
  // mistake it for React's `use` hook.
  api: [
    async ({ page }, provide) => {
      const api = new ApiMock(page);
      await api.install();
      await provide(api);
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
