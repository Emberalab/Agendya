import { expect, test } from '../../fixtures/test';
import { STORAGE_STATE } from '../../utils/auth-state';
import { makeProfile } from '../../fixtures/data';

test.use({ storageState: STORAGE_STATE });

test('renders the profile returned by the API', async ({ page }) => {
  const profile = makeProfile();
  await page.goto('/dashboard/profile');

  await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible();
  await expect(page.getByPlaceholder(/Mi Barbería/)).toHaveValue(
    profile.businessName,
  );
  await expect(page.getByPlaceholder('nombre-del-negocio')).toHaveValue(
    profile.slug,
  );
});

test('saves an edited business name', async ({ page, api }) => {
  await page.goto('/dashboard/profile');

  const businessName = page.getByPlaceholder(/Mi Barbería/);
  await expect(businessName).toHaveValue('Barbería E2E');

  const save = page.getByRole('button', { name: 'Guardar cambios' });
  await expect(save).toBeDisabled();

  await businessName.fill('Barbería E2E Renovada');
  await expect(save).toBeEnabled();
  await save.click();

  await expect(page.getByText('Cambios guardados.')).toBeVisible();
  await expect(save).toBeDisabled();

  const patch = api.calls.find(
    (call) => call.path === '/professionals/me' && call.method === 'PATCH',
  );
  expect(patch?.body).toMatchObject({ businessName: 'Barbería E2E Renovada' });
});

// Regression: the sidebar avatar's initial/name read from the auth store's
// cached `user`, which used to be set only at login — a saved profile change
// never reached it, so the initial (and the name under it) stayed on
// whatever was true when the session started until the next login. A Google
// sign-up starts with an empty `businessName` (filled in later from the
// Profile page), so for that account the avatar just stayed blank forever.
test('updates the sidebar avatar and name right after saving the business name — no reload needed', async ({
  page,
}) => {
  await page.goto('/dashboard/profile');

  const sidebar = page.getByRole('complementary');
  await expect(sidebar.getByText('Barbería E2E', { exact: true })).toBeVisible();
  await expect(sidebar.getByText('B', { exact: true })).toBeVisible();

  await page.getByPlaceholder(/Mi Barbería/).fill('Estudio Renovado');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cambios guardados.')).toBeVisible();

  await expect(sidebar.getByText('Estudio Renovado', { exact: true })).toBeVisible();
  await expect(sidebar.getByText('E', { exact: true })).toBeVisible();
  await expect(
    sidebar.getByText('Barbería E2E', { exact: true }),
  ).not.toBeVisible();
});

test('shows the server error when the update is rejected', async ({
  page,
  api,
}) => {
  await api.overrideOnce('PATCH', /^\/professionals\/me$/, {
    status: 409,
    body: { message: 'Ese enlace público ya está en uso.' },
  });

  await page.goto('/dashboard/profile');
  await page.getByPlaceholder(/Mi Barbería/).fill('Otro Nombre');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  await expect(
    page.getByText('Ese enlace público ya está en uso.'),
  ).toBeVisible();
});
