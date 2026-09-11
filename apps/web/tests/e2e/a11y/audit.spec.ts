import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/test';
import { STORAGE_STATE } from '../../utils/auth-state';
import { PUBLIC_SLUG, makeHomeServiceAgendaBooking } from '../../fixtures/data';

/**
 * WCAG 2.2 AA automated audit. Runs axe-core against the rendered page (real
 * browser, real CSS cascade — this is what catches color-contrast, missing
 * accessible names, invalid ARIA, landmark and heading-order issues). It is a
 * floor, not a ceiling: things axe can't verify (focus trapping, Escape
 * behavior, logical focus order, restoring focus on close) are covered by the
 * interaction assertions in the other e2e specs instead.
 */
async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const summary = results.violations
    .map(
      (v) =>
        `\n[${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} node(s))\n` +
        v.nodes
          .map((n) => `  ${n.target.join(' ')} :: ${n.failureSummary}`)
          .join('\n'),
    )
    .join('\n');

  expect(results.violations.length, summary).toBe(0);
}

/** Seeds an explicit manual theme choice the same way the app's own boot script reads it, before any app code runs. */
async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript((t) => {
    window.localStorage.setItem(
      'agendya-theme',
      JSON.stringify({ state: { manualTheme: t }, version: 0 }),
    );
  }, theme);
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`${theme} theme — public pages`, () => {
    test.beforeEach(async ({ page }) => {
      await setTheme(page, theme);
    });

    test('login page', async ({ page }) => {
      await page.goto('/login');
      await expect(
        page.getByRole('heading', { name: 'Inicia sesión' }),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test('register page', async ({ page }) => {
      await page.goto('/register');
      await expect(
        page.getByRole('heading', { name: 'Crea tu cuenta' }),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test('forgot-password page', async ({ page }) => {
      await page.goto('/forgot-password');
      await expectNoViolations(page);
    });

    test('login page with a validation error showing', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Correo electrónico *').fill('not-an-email');
      await page.getByLabel('Contraseña *').fill('x');
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await expectNoViolations(page);
    });

    test('public booking landing page', async ({ page }) => {
      await page.goto(`/${PUBLIC_SLUG}`);
      await expect(
        page.getByRole('heading', { name: 'María Belleza' }),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test('public booking wizard, service step', async ({ page }) => {
      await page.goto(`/${PUBLIC_SLUG}`);
      await page.getByRole('button', { name: 'Reservar cita' }).click();
      await expect(page.getByText('Elige un servicio')).toBeVisible();
      await expectNoViolations(page);
    });
  });

  test.describe(`${theme} theme — dashboard`, () => {
    test.use({ storageState: STORAGE_STATE });
    test.beforeEach(async ({ page }) => {
      await setTheme(page, theme);
    });

    test('profile page', async ({ page }) => {
      await page.goto('/dashboard/profile');
      await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible();
      await expectNoViolations(page);
    });

    test('services page', async ({ page }) => {
      await page.goto('/dashboard/services');
      await expect(
        page.getByRole('heading', { name: 'Servicios' }),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test('services page — delete confirmation dialog open', async ({
      page,
    }) => {
      await page.goto('/dashboard/services');
      await page.getByText('Corte de cabello').first().waitFor();
      await page
        .getByRole('button', { name: 'Más acciones para Corte de cabello' })
        .click();
      await page.getByRole('button', { name: 'Eliminar servicio' }).click();
      await expect(
        page.getByRole('dialog', { name: 'Eliminar servicio' }),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test('agenda page', async ({ page }) => {
      await page.goto('/dashboard/agenda');
      await expect(page.getByRole('heading', { name: 'Tu agenda' })).toBeVisible();
      await expectNoViolations(page);
    });

    test('agenda page — appointment detail drawer open', async ({ page }) => {
      await page.goto('/dashboard/agenda');
      await page
        .getByRole('button', { name: 'Ver detalle' })
        .first()
        .click();
      await expect(
        page.getByRole('dialog', { name: 'Detalle de la cita' }),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test('agenda page — appointment detail drawer for a home-service booking', async ({
      page,
      api,
    }) => {
      api.setAgenda([
        makeHomeServiceAgendaBooking({
          customerAddress:
            'Calle 10 #43C-20, Apartamento 502 Torre 1, Barrio El Poblado (Ref.: portón negro junto a la panadería)',
        }),
      ]);
      await page.goto('/dashboard/agenda');
      await page
        .getByRole('button', { name: 'Ver detalle' })
        .first()
        .click();
      await expect(
        page.getByRole('dialog', { name: 'Detalle de la cita' }),
      ).toBeVisible();
      await expect(page.getByText('DOMICILIO', { exact: true })).toBeVisible();
      await expectNoViolations(page);
    });

    test('schedule page', async ({ page }) => {
      await page.goto('/dashboard/schedule');
      await expect(
        page.getByRole('heading', { name: 'Horario Semanal' }),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test('notification centre — list, detail view, and delete-read dialog', async ({
      page,
      api,
    }) => {
      api.seedNotifications([
        {
          id: '00000000-0000-4000-8000-0000000000c1',
          type: 'APPOINTMENT_CREATED',
          title: 'Nueva cita',
          body: 'Carla reservó Corte premium',
          data: {
            bookingId: '00000000-0000-4000-8000-0000000000d1',
            customerName: 'Carla',
            serviceName: 'Corte premium',
            startAt: '2099-09-10T18:30:00.000Z',
          },
          readAt: null,
          createdAt: new Date().toISOString(),
        },
        {
          id: '00000000-0000-4000-8000-0000000000c2',
          type: 'APPOINTMENT_CREATED',
          title: 'Cita leída',
          body: 'Bruno reservó Barba',
          data: {
            bookingId: '00000000-0000-4000-8000-0000000000d2',
            customerName: 'Bruno',
            serviceName: 'Barba',
            startAt: '2099-09-11T18:30:00.000Z',
          },
          readAt: '2099-01-01T00:00:00.000Z',
          createdAt: '2099-01-01T00:00:00.000Z',
        },
      ]);

      await page.goto('/dashboard/agenda');
      await page
        .getByRole('button', { name: /^Notificaciones/ })
        .filter({ visible: true })
        .first()
        .click();
      const panel = page.getByRole('dialog', { name: 'Notificaciones' });
      await expect(panel.getByText('Cita leída')).toBeVisible();

      // Detail view (new): heading, ← control, facts list, primary CTA.
      await panel.getByRole('button', { name: /Nueva cita\./ }).click();
      await expect(
        panel.getByRole('heading', { name: 'Detalle de la cita' }),
      ).toBeVisible();
      await expectNoViolations(page);
      await panel
        .getByRole('button', { name: 'Volver a notificaciones' })
        .click();

      // Bulk-delete confirmation dialog (new).
      await panel.getByRole('button', { name: 'Eliminar leídas' }).click();
      await expect(
        page.getByRole('dialog', {
          name: '¿Eliminar notificaciones leídas?',
        }),
      ).toBeVisible();
      await expectNoViolations(page);
    });
  });
}
