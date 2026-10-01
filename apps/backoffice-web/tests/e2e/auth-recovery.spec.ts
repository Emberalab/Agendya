import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import type { BackofficeAuthResponse, InternalUser } from '@agendya/types';

// Mirrors BACKOFFICE_RESET_TOKEN_INVALID_CODE — a value import from the
// CommonJS @agendya/types build doesn't load in Playwright's ESM runner.
const RESET_TOKEN_INVALID_CODE = 'BACKOFFICE_RESET_TOKEN_INVALID';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4001';

const user: InternalUser = {
  id: 'internal-1',
  email: 'support@agendya.test',
  name: 'Support Agent',
  role: 'SUPPORT',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

async function stubApp(page: Page) {
  await page.route(`${API_URL}/backoffice/auth/login`, (route) =>
    route.fulfill(
      json({
        accessToken: 'password-token',
        user,
      } satisfies BackofficeAuthResponse),
    ),
  );
  await page.route(`${API_URL}/backoffice/auth/me`, (route) =>
    route.request().headers().authorization === 'Bearer google-token'
      ? route.fulfill(json(user))
      : route.fulfill(json({ message: 'Unauthorized' }, 401)),
  );
  await page.route(`${API_URL}/backoffice/dashboard`, (route) =>
    route.fulfill(
      json({
        openTickets: 0,
        urgentTickets: 0,
        waitingForCustomerTickets: 0,
        unassignedTickets: 0,
        recentTickets: [],
      }),
    ),
  );
  await page.route(
    new RegExp(`${API_URL}/backoffice/tickets(\\?.*)?$`),
    (route) => route.fulfill(json({ items: [], nextCursor: null })),
  );
}

async function signIn(page: Page, { remember }: { remember: boolean }) {
  await page.goto('/backoffice/login');
  await page.getByLabel('Correo electrónico').fill('support@agendya.test');
  await page.getByLabel(/^Contraseña/).fill('supersecret123');
  if (remember) await page.getByLabel('Recordarme').check();
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();
}

test.describe('Backoffice sign-in screen', () => {
  test('mirrors the main app: password toggle, recovery link, Google, no self-sign-up', async ({
    page,
  }) => {
    await page.goto('/backoffice/login');
    await expect(
      page.getByRole('heading', { name: 'Inicia sesión' }),
    ).toBeVisible();

    const password = page.getByLabel(/^Contraseña/);
    await password.fill('secreto123');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
    await expect(password).toHaveAttribute('type', 'password');

    await expect(page.getByLabel('Recordarme')).not.toBeChecked();
    await expect(
      page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Continuar con Google' }),
    ).toBeVisible();
    await expect(
      page.getByText('Pídela a un administrador del Backoffice'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Regístrate/ })).toHaveCount(0);
  });

  test('validates fields before calling the API', async ({ page }) => {
    let called = false;
    await page.route(`${API_URL}/backoffice/auth/login`, (route) => {
      called = true;
      return route.fulfill(json({}, 500));
    });
    await page.goto('/backoffice/login');
    await page.getByLabel('Correo electrónico').fill('no-es-correo');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page.getByText('El correo no es válido.')).toBeVisible();
    await expect(page.getByText('Ingresa tu contraseña.')).toBeVisible();
    expect(called).toBe(false);
  });

  test('"Recordarme" off keeps the session for this browser session and shares it with new tabs', async ({
    page,
    context,
  }) => {
    await stubApp(page);
    await signIn(page, { remember: false });

    const stored = await page.evaluate(() => ({
      local: localStorage.getItem('agendya-backoffice-auth'),
      session: sessionStorage.getItem('agendya-backoffice-auth'),
    }));
    expect(stored.local).toBeNull();
    expect(stored.session).toContain('password-token');

    // Opening another tab (e.g. a ticket link) doesn't log the agent out.
    const second = await context.newPage();
    await stubApp(second);
    await second.goto('/backoffice/tickets');
    await expect(
      second.getByRole('heading', { name: 'Tickets' }),
    ).toBeVisible();

    // Logging out in one tab logs out the other.
    await second.setViewportSize({ width: 1280, height: 800 });
    await second.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(second).toHaveURL(/\/backoffice\/login$/);
    await expect(page).toHaveURL(/\/backoffice\/login$/);
  });

  test('"Recordarme" on keeps the session in persistent storage', async ({
    page,
  }) => {
    await stubApp(page);
    await signIn(page, { remember: true });
    const local = await page.evaluate(() =>
      localStorage.getItem('agendya-backoffice-auth'),
    );
    expect(local).toContain('password-token');
  });
});

test.describe('Google sign-in', () => {
  test('completes through the callback, keeping the token out of the address bar', async ({
    page,
  }) => {
    await stubApp(page);
    // Stand-in for the API → Google → API round trip.
    await page.route(`${API_URL}/backoffice/auth/google`, (route) =>
      route.fulfill({
        status: 302,
        headers: {
          location: `${new URL(page.url()).origin}/backoffice/auth/callback#token=google-token`,
        },
      }),
    );
    await page.goto('/backoffice/login');
    await page.getByLabel('Recordarme').check();
    await page.getByRole('button', { name: 'Continuar con Google' }).click();

    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();
    expect(page.url()).not.toContain('token');
    const local = await page.evaluate(() =>
      localStorage.getItem('agendya-backoffice-auth'),
    );
    expect(local).toContain('google-token');
  });

  test('explains why Google sign-in was refused', async ({ page }) => {
    await page.goto('/backoffice/login?error=google_no_account');
    await expect(page.getByRole('alert')).toContainText(
      'No hay una cuenta activa del Backoffice con ese correo de Google',
    );
  });

  test('a callback without a token goes back to the sign-in with an error', async ({
    page,
  }) => {
    await page.goto('/backoffice/auth/callback');
    await expect(page).toHaveURL(/error=google_failed/);
    await expect(page.getByRole('alert')).toContainText(
      'No pudimos completar el acceso con Google',
    );
  });
});

test.describe('Password recovery', () => {
  test('requests a link from the sign-in screen, prefilled, with a resend cooldown', async ({
    page,
  }) => {
    let body: unknown;
    await page.route(`${API_URL}/backoffice/auth/forgot-password`, (route) => {
      body = route.request().postDataJSON();
      return route.fulfill(json({ success: true }));
    });
    await page.goto('/backoffice/login');
    await page.getByLabel('Correo electrónico').fill('support@agendya.test');
    await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();

    await expect(
      page.getByRole('heading', { name: '¿Olvidaste tu contraseña?' }),
    ).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toHaveValue(
      'support@agendya.test',
    );
    await page.getByRole('button', { name: 'Enviar enlace' }).click();

    await expect(
      page.getByRole('heading', { name: 'Revisa tu correo' }),
    ).toBeVisible();
    expect(body).toEqual({ email: 'support@agendya.test' });
    await expect(
      page.getByRole('button', { name: /Reenviar en \d+ s/ }),
    ).toBeDisabled();
  });

  test('sets a new password from the emailed link', async ({ page }) => {
    let body: unknown;
    await page.route(`${API_URL}/backoffice/auth/reset-password`, (route) => {
      body = route.request().postDataJSON();
      return route.fulfill(json({ success: true }));
    });
    await page.goto('/backoffice/reset-password?token=abc123');

    await page.getByLabel(/^Nueva contraseña/).fill('nuevaclave123');
    await page.getByLabel(/^Confirma la contraseña/).fill('otraclave123');
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible();
    expect(body).toBeUndefined();

    await page.getByLabel(/^Confirma la contraseña/).fill('nuevaclave123');
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();
    await expect(
      page.getByRole('heading', { name: 'Contraseña actualizada' }),
    ).toBeVisible();
    expect(body).toEqual({ token: 'abc123', password: 'nuevaclave123' });
  });

  test('an expired or used link offers a new one', async ({ page }) => {
    await page.route(`${API_URL}/backoffice/auth/reset-password`, (route) =>
      route.fulfill(
        json({ code: RESET_TOKEN_INVALID_CODE, message: 'x' }, 400),
      ),
    );
    await page.goto('/backoffice/reset-password?token=used');
    await page.getByLabel(/^Nueva contraseña/).fill('nuevaclave123');
    await page.getByLabel(/^Confirma la contraseña/).fill('nuevaclave123');
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();

    await expect(
      page.getByRole('heading', { name: 'Enlace no válido' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Pedir un enlace nuevo' }).click();
    await expect(page).toHaveURL(/\/backoffice\/forgot-password$/);
  });
});

for (const theme of ['light', 'dark'] as const) {
  test(`sign-in, recovery and reset screens pass axe in the ${theme} theme`, async ({
    page,
  }) => {
    await page.addInitScript((t) => {
      localStorage.setItem(
        'agendya-backoffice-theme',
        JSON.stringify({ state: { manualTheme: t }, version: 0 }),
      );
    }, theme);
    for (const path of [
      '/backoffice/login?error=google_failed',
      '/backoffice/forgot-password',
      '/backoffice/reset-password?token=abc',
    ]) {
      await page.goto(path);
      await page.getByRole('heading').first().waitFor();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const summary = results.violations
        .map(
          (v) =>
            `${path} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        )
        .join('\n');
      expect(results.violations, summary).toEqual([]);
    }
  });
}
