import { expect, test } from '../../fixtures/test';
import { STORAGE_STATE } from '../../utils/auth-state';

test.use({ storageState: STORAGE_STATE });

test('moves between the four dashboard sections from the sidebar', async ({
  page,
}) => {
  await page.goto('/dashboard/profile');
  await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible();

  const sidebar = page.getByRole('complementary');

  await sidebar.getByRole('link', { name: 'Servicios' }).click();
  await expect(page).toHaveURL(/\/dashboard\/services$/);
  await expect(page.getByRole('heading', { name: 'Servicios' })).toBeVisible();

  await sidebar.getByRole('link', { name: 'Horario' }).click();
  await expect(page).toHaveURL(/\/dashboard\/schedule$/);
  await expect(
    page.getByRole('heading', { name: 'Horario Semanal' }),
  ).toBeVisible();

  await sidebar.getByRole('link', { name: 'Agenda' }).click();
  await expect(page).toHaveURL(/\/dashboard\/agenda$/);
  await expect(page.getByRole('heading', { name: 'Tu agenda' })).toBeVisible();

  await sidebar.getByRole('link', { name: 'Perfil' }).click();
  await expect(page).toHaveURL(/\/dashboard\/profile$/);
  await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible();
});

test('logging out returns to the login screen', async ({ page }) => {
  await page.goto('/dashboard/profile');

  await page
    .getByRole('complementary')
    .getByRole('button', { name: 'Cerrar sesión' })
    .click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Inicia sesión' }),
  ).toBeVisible();
});
