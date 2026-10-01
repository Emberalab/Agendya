import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../../fixtures/test';
import { SUPER_ADMIN_USER, TEST_ACCESS_TOKEN } from '../../fixtures/data';

// Super Admin backoffice: find an account with the type-ahead, then grant,
// extend and end its 30-day full-access trial. The admin route is gated on the
// persisted session's role, so these specs seed a SUPER_ADMIN session instead
// of the shared professional storage state.

test.beforeEach(async ({ page, api }) => {
  api.asSuperAdmin();
  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem(
        'agendya-auth',
        JSON.stringify({ state: { accessToken: token, user }, version: 0 }),
      );
    },
    { token: TEST_ACCESS_TOKEN, user: SUPER_ADMIN_USER },
  );
});

/** Grant/extend/end ask for confirmation in the app's own alertdialog. */
async function confirmAction(
  page: import('@playwright/test').Page,
  confirmLabel: string,
) {
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: confirmLabel }).click();
  await expect(dialog).toBeHidden();
}

async function openPlanTab(page: import('@playwright/test').Page) {
  await page.goto('/dashboard/admin');
  await page.getByRole('tab', { name: 'Plan y prueba' }).click();
  return page.getByRole('combobox', {
    name: 'Buscar profesional por correo o negocio',
  });
}

test('Registros shows each account’s trial in its own column', async ({
  page,
}) => {
  await page.goto('/dashboard/admin');

  await expect(
    page.getByRole('columnheader', { name: 'Prueba' }),
  ).toBeVisible();
  const row = (email: string) =>
    page.getByRole('row').filter({ hasText: email });
  await expect(row('lucia@barberia.test')).toContainText('Terminó el');
  await expect(row('gaitan9103@gmail.com')).toContainText('—');
});

test('the search waits for three characters, then suggests accounts', async ({
  page,
  api,
}) => {
  const search = await openPlanTab(page);

  await search.fill('jo');
  await expect(
    page.getByText('Escribe al menos 3 caracteres para buscar.'),
  ).toBeVisible();
  await page.waitForTimeout(400);
  expect(api.calls.some((c) => c.path === '/admin/professionals')).toBe(false);

  await search.pressSequentially('r');
  const options = page.getByRole('option');
  await expect(options).toHaveCount(2);
  await expect(options.first()).toContainText('gaitan9103@gmail.com');
  const searches = api.calls.filter((c) => c.path === '/admin/professionals');
  expect(searches.at(-1)?.query.get('q')).toBe('jor');

  // Keyboard pick loads the account detail.
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page.getByText('Sin período de prueba')).toBeVisible();
  await expect(search).toHaveValue('gaitan9103@gmail.com');
});

test('grants, extends and ends a trial, recording each step', async ({
  page,
  api,
}) => {
  const search = await openPlanTab(page);
  await search.fill('gaitan');
  await page.getByRole('option', { name: /gaitan9103@gmail.com/ }).click();

  await page.getByLabel('Nota para el historial (opcional)').fill('Piloto');
  await page.getByRole('button', { name: 'Activar prueba de 30 días' }).click();
  await confirmAction(page, 'Activar prueba');

  await expect(page.getByText('Prueba de 30 días activada.')).toBeVisible();
  await expect(
    page.getByText('Activa · acceso completo (Negocios)'),
  ).toBeVisible();
  await expect(page.getByText(/Prueba activada ·/)).toBeVisible();
  await expect(page.getByText('“Piloto”')).toBeVisible();

  // The client never sends dates: only intent (and the optional note).
  const grant = api.calls.find(
    (c) =>
      c.method === 'POST' &&
      c.path === '/admin/professionals/gaitan9103%40gmail.com/trial',
  );
  expect(grant?.body).toEqual({ note: 'Piloto' });

  await page.getByLabel('Días a extender').fill('7');
  await page.getByRole('button', { name: 'Extender' }).click();
  await confirmAction(page, 'Extender');
  await expect(page.getByText('Prueba extendida 7 días.')).toBeVisible();
  await expect(page.getByText(/Prueba extendida ·/)).toBeVisible();

  await page.getByRole('button', { name: 'Terminar prueba' }).click();
  await confirmAction(page, 'Terminar prueba');
  await expect(page.getByText('Prueba terminada.')).toBeVisible();
  await expect(page.getByText('Terminada', { exact: true })).toBeVisible();
  await expect(page.getByText(/Prueba terminada ·/)).toBeVisible();

  // Registros reflects the change.
  await page.getByRole('tab', { name: 'Registros' }).click();
  await expect(
    page.getByRole('row').filter({ hasText: 'gaitan9103@gmail.com' }),
  ).toContainText('Terminó el');
});

test('a used trial needs an explicit exception to be granted again', async ({
  page,
  api,
}) => {
  const search = await openPlanTab(page);
  await search.fill('lucia');
  await page.getByRole('option', { name: /lucia@barberia.test/ }).click();

  const grant = page.getByRole('button', { name: 'Activar prueba de 30 días' });
  await expect(grant).toBeDisabled();

  await page
    .getByRole('checkbox', { name: /Permitir una nueva \(excepción\)/ })
    .check();
  await grant.click();
  await confirmAction(page, 'Activar prueba');

  await expect(page.getByText('Prueba de 30 días activada.')).toBeVisible();
  const call = api.calls.find(
    (c) => c.method === 'POST' && c.path.endsWith('/trial'),
  );
  expect(call?.body).toEqual({ allowRepeat: true });
});

test('the section tabs follow the ARIA tabs pattern', async ({ page }) => {
  await page.goto('/dashboard/admin');
  const tablist = page.getByRole('tablist', { name: 'Secciones del panel' });
  const registros = tablist.getByRole('tab', { name: 'Registros' });
  await expect(registros).toHaveAttribute('aria-selected', 'true');

  await registros.focus();
  await page.keyboard.press('ArrowRight');
  const lista = tablist.getByRole('tab', { name: 'Lista de Acceso' });
  await expect(lista).toBeFocused();
  await expect(lista).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toBeVisible();

  await page.keyboard.press('End');
  await expect(tablist.getByRole('tab', { name: 'Precios' })).toBeFocused();
});

test('the tab bar scrolls inside itself on a phone instead of the page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/dashboard/admin');
  await expect(page.getByRole('tablist')).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

for (const theme of ['light', 'dark'] as const) {
  test(`admin panel passes axe in the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((t) => {
      window.localStorage.setItem(
        'agendya-theme',
        JSON.stringify({ state: { manualTheme: t }, version: 0 }),
      );
    }, theme);
    await page.goto('/dashboard/admin');
    await expect(
      page.getByRole('columnheader', { name: 'Prueba' }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .disableRules(['meta-viewport'])
      .analyze();
    const summary = results.violations
      .map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      )
      .join('\n');
    expect(results.violations, summary).toEqual([]);
  });
}
