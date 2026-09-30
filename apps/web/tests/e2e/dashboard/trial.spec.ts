import { expect, test } from '../../fixtures/test';
import { STORAGE_STATE } from '../../utils/auth-state';
import { makeServices, makeTrial } from '../../fixtures/data';

test.use({ storageState: STORAGE_STATE });

// The professional's side of the 30-day full-access trial. Whether the trial
// is active comes from the API (`trial.active`, `effectivePlan`); the stub
// mirrors that server-side resolution.

const BANNER_TEXT =
  'Estás disfrutando de acceso completo durante tu período de prueba.';

test.describe('active trial', () => {
  test.beforeEach(({ api }) => {
    api.setTrial(makeTrial({ daysLeft: 11.5 }));
  });

  test('shows the full-access banner with the days left', async ({ page }) => {
    await page.goto('/dashboard/profile');

    const banner = page.getByRole('status').filter({ hasText: BANNER_TEXT });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('termina en 12 días');

    await banner.getByRole('link', { name: 'Ver detalles' }).click();
    await expect(page).toHaveURL(/\/dashboard\/profile$/);
  });

  test('explains the trial and what happens after it on the plan card', async ({
    page,
  }) => {
    await page.goto('/dashboard/profile');

    await expect(page.getByText('Prueba · acceso completo')).toBeVisible();
    await expect(
      page.getByText(/Después seguirás en el plan Gratuito con sus límites/),
    ).toBeVisible();
  });

  test('lifts the FREE service limit while the trial is active', async ({
    page,
    api,
  }) => {
    // 3 services = the FREE cap; the trial must still allow a 4th.
    const services = makeServices();
    api.setServices([
      ...services,
      { ...services[0], id: 'e2e-service-3', name: 'Tinte', sortOrder: 2 },
    ]);

    await page.goto('/dashboard/services');
    await page.getByText('Corte de cabello').first().waitFor();
    await page.getByRole('button', { name: 'Crear servicio' }).click();

    await expect(page).toHaveURL(/\/dashboard\/services\/new$/);
    await expect(page.getByText('Límite de servicios alcanzado')).toHaveCount(
      0,
    );
  });
});

test.describe('ended trial', () => {
  test.beforeEach(({ api }) => {
    api.setTrial(makeTrial({ daysLeft: -10 }));
  });

  test('drops the banner and says when the trial ended', async ({ page }) => {
    await page.goto('/dashboard/profile');

    await expect(
      page.getByText(/Tu período de prueba terminó el/),
    ).toBeVisible();
    await expect(page.getByText(BANNER_TEXT)).toHaveCount(0);
    await expect(page.getByText('Prueba · acceso completo')).toHaveCount(0);
  });

  test('applies the FREE service limit again', async ({ page, api }) => {
    const services = makeServices();
    api.setServices([
      ...services,
      { ...services[0], id: 'e2e-service-3', name: 'Tinte', sortOrder: 2 },
    ]);

    await page.goto('/dashboard/services');
    await page.getByText('Corte de cabello').first().waitFor();
    await page.getByRole('button', { name: 'Crear servicio' }).click();

    await expect(page.getByText('Límite de servicios alcanzado')).toBeVisible();
  });
});
