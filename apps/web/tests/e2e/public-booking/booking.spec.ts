import { expect, test } from '../../fixtures/test';
import { PUBLIC_SLUG } from '../../fixtures/data';

test.describe('Public booking page', () => {
  test('shows the professional landing page for a known slug', async ({
    page,
  }) => {
    await page.goto(`/${PUBLIC_SLUG}`);

    await expect(
      page.getByRole('heading', { name: 'María Belleza' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Reservar cita' }),
    ).toBeVisible();
  });

  test('starts the wizard and lists the services', async ({ page }) => {
    await page.goto(`/${PUBLIC_SLUG}`);

    await page.getByRole('button', { name: 'Reservar cita' }).click();

    await expect(page.getByText('Elige un servicio')).toBeVisible();
    await expect(page.getByText('Corte de cabello')).toBeVisible();
    await expect(page.getByText('Manicure')).toBeVisible();

    const continueButton = page.getByRole('button', { name: /Continuar/ });
    await expect(continueButton).toBeDisabled();

    await page.getByText('Corte de cabello').click();
    await expect(continueButton).toBeEnabled();
  });

  test('shows a not-found message for an unknown slug', async ({
    page,
    api,
  }) => {
    await api.overrideOnce('GET', /^\/public\/professionals\/[^/]+$/, {
      status: 404,
      body: { message: 'No encontrado' },
    });

    await page.goto('/slug-que-no-existe');

    await expect(page.getByText('No encontramos esta página.')).toBeVisible();
  });
});
