import { expect, test } from '../../fixtures/test';

test.describe('Email + password login', () => {
  test('signs in and lands on the profile page', async ({ page, api }) => {
    await page.goto('/login');

    await page.getByLabel('Correo electrónico *').fill('e2e@agendya.test');
    await page.getByLabel('Contraseña *').fill('Sup3rSecret');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/dashboard\/profile$/);
    await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible();

    const loginCall = api.calls.find((call) => call.path === '/auth/login');
    expect(loginCall?.body).toMatchObject({
      email: 'e2e@agendya.test',
      password: 'Sup3rSecret',
    });
  });

  test('shows an inline validation error for a malformed email', async ({
    page,
  }) => {
    await page.goto('/login');

    await page.getByLabel('Correo electrónico *').fill('not-an-email');
    await page.getByLabel('Contraseña *').fill('whatever');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(
      page.getByText(/eso no parece un correo/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('surfaces the server error when credentials are rejected', async ({
    page,
    api,
  }) => {
    await api.overrideOnce('POST', /^\/auth\/login$/, {
      status: 401,
      body: { message: 'Correo o contraseña incorrectos.' },
    });

    await page.goto('/login');
    await page.getByLabel('Correo electrónico *').fill('e2e@agendya.test');
    await page.getByLabel('Contraseña *').fill('wrong-password');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(
      page.getByText('Correo o contraseña incorrectos.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
