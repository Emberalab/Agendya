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
  // Grant/extend/end ask for confirmation with window.confirm.
  page.on('dialog', (dialog) => void dialog.accept());
});

async function openPlanTab(page: import('@playwright/test').Page) {
  await page.goto('/dashboard/admin');
  await page.getByRole('button', { name: 'Plan y prueba' }).click();
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
  await expect(page.getByText('Prueba extendida 7 días.')).toBeVisible();
  await expect(page.getByText(/Prueba extendida ·/)).toBeVisible();

  await page.getByRole('button', { name: 'Terminar prueba' }).click();
  await expect(page.getByText('Prueba terminada.')).toBeVisible();
  await expect(page.getByText('Terminada', { exact: true })).toBeVisible();
  await expect(page.getByText(/Prueba terminada ·/)).toBeVisible();

  // Registros reflects the change.
  await page.getByRole('button', { name: 'Registros' }).click();
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

  await expect(page.getByText('Prueba de 30 días activada.')).toBeVisible();
  const call = api.calls.find(
    (c) => c.method === 'POST' && c.path.endsWith('/trial'),
  );
  expect(call?.body).toEqual({ allowRepeat: true });
});
