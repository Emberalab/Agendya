import { expect, test } from '../fixtures/test';

test.describe('App shell', () => {
  test('redirects an unauthenticated visitor to the login page', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', { name: 'Inicia sesión' }),
    ).toBeVisible();
  });

  test('links from login to the registration page', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: 'Regístrate gratis' }).click();

    await expect(page).toHaveURL(/\/register$/);
    await expect(
      page.getByRole('heading', { name: 'Crea tu cuenta' }),
    ).toBeVisible();
  });

  test('sends deep unknown routes back to login', async ({ page }) => {
    // A single unknown segment is treated as a public booking slug; a deeper
    // path matches no route and the catch-all redirects to login.
    await page.goto('/no/such/deep/route');

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole('heading', { name: 'Inicia sesión' }),
    ).toBeVisible();
  });
});
