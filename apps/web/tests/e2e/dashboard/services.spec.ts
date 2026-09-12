import { expect, test } from '../../fixtures/test';
import { STORAGE_STATE } from '../../utils/auth-state';
import { makeServices } from '../../fixtures/data';

test.use({ storageState: STORAGE_STATE });

test('lists the services returned by the API', async ({ page }) => {
  await page.goto('/dashboard/services');

  await expect(page.getByRole('heading', { name: 'Servicios' })).toBeVisible();
  await expect(page.getByText('Corte de cabello').first()).toBeVisible();
  await expect(page.getByText('Arreglo de barba').first()).toBeVisible();
  await expect(page.getByText('40 min').first()).toBeVisible();
});

test('opens the create form while under the plan limit', async ({ page }) => {
  await page.goto('/dashboard/services');
  await page.getByText('Corte de cabello').first().waitFor();

  await page.getByRole('button', { name: 'Crear servicio' }).click();

  await expect(page).toHaveURL(/\/dashboard\/services\/new$/);
});

test('blocks creation with a plan-limit dialog once at the limit', async ({
  page,
  api,
}) => {
  // FREE allows 3 services; seed exactly 3.
  const services = makeServices();
  api.setServices([
    ...services,
    { ...services[0], id: 'e2e-service-3', name: 'Tinte', sortOrder: 2 },
  ]);

  await page.goto('/dashboard/services');
  await page.getByText('Corte de cabello').first().waitFor();

  await page.getByRole('button', { name: 'Crear servicio' }).click();

  await expect(page.getByText('Límite de servicios alcanzado')).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\/services$/);
});

test('deletes a service after confirming', async ({ page, api }) => {
  await page.goto('/dashboard/services');
  await page.getByText('Corte de cabello').first().waitFor();

  await page
    .getByRole('button', { name: 'Más acciones para Corte de cabello' })
    .click();
  await page.getByRole('button', { name: 'Eliminar servicio' }).click();

  const dialog = page.getByRole('dialog', { name: 'Eliminar servicio' });
  await dialog.getByRole('button', { name: 'Eliminar' }).click();

  await expect(dialog).toBeHidden();
  await expect(
    page.getByText('Se muestran 1 servicio de tu catálogo actual.'),
  ).toBeVisible();
  await expect(page.getByText('Corte de cabello')).toHaveCount(0);

  expect(
    api.calls.some(
      (call) => call.method === 'DELETE' && call.path.startsWith('/services/'),
    ),
  ).toBe(true);
});
