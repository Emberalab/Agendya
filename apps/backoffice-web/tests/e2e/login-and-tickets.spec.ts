import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type {
  BackofficeAuthResponse,
  BackofficeDashboard,
  InternalUser,
  TicketListResponse,
} from '@agendya/types';

/**
 * Self-contained: stubs `/backoffice/*` directly rather than extending the
 * shared `ApiMock` (which only knows the customer-facing API), so this stays
 * isolated proof that the Backoffice route tree, its own auth store, and its
 * role-gated UI actually work end to end.
 */
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4001';

const supportUser: InternalUser = {
  id: 'internal-1',
  email: 'support@agendya.test',
  name: 'Support Agent',
  role: 'SUPPORT',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const readOnlyUser: InternalUser = {
  ...supportUser,
  id: 'internal-2',
  role: 'READ_ONLY',
};

const dashboard: BackofficeDashboard = {
  openTickets: 2,
  urgentTickets: 1,
  waitingForCustomerTickets: 0,
  unassignedTickets: 1,
  recentTickets: [],
};

const ticketList: TicketListResponse = {
  items: [
    {
      id: 'ticket-1',
      professional: {
        id: 'prof-1',
        businessName: 'Barbería Test',
        email: 'pro@agendya.test',
        slug: 'barberia-test',
      },
      subject: 'No llegó la notificación de una cita',
      category: 'NOTIFICATIONS',
      priority: 'HIGH',
      status: 'OPEN',
      assignedTo: null,
      relatedBookingId: null,
      messageCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  nextCursor: null,
};

async function installBackofficeStubs(
  page: import('@playwright/test').Page,
  user: InternalUser,
) {
  await page.route(`${API_URL}/backoffice/auth/login`, (route) => {
    const response: BackofficeAuthResponse = {
      accessToken: 'fake-token',
      user,
    };
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
  await page.route(`${API_URL}/backoffice/dashboard`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(dashboard),
    }),
  );
  await page.route(
    new RegExp(`${API_URL}/backoffice/tickets(\\?.*)?$`),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ticketList),
      }),
  );
}

test.describe('Backoffice', () => {
  test('a support agent can log in and reach the ticket queue', async ({
    page,
  }) => {
    await installBackofficeStubs(page, supportUser);

    await page.goto('/backoffice/login');
    await page.getByLabel('Correo').fill('support@agendya.test');
    await page.getByLabel(/^Contraseña/).fill('supersecret123');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/backoffice$/);
    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();

    await page.getByRole('link', { name: 'Tickets' }).click();
    await expect(page).toHaveURL(/\/backoffice\/tickets$/);
    await expect(
      page.getByText('No llegó la notificación de una cita'),
    ).toBeVisible();

    // SUPPORT has MUTATE_TICKETS, so the queue exposes a way to open a new one.
    await expect(
      page.getByRole('button', { name: 'Nuevo ticket' }),
    ).toBeVisible();
  });

  test('a READ_ONLY agent cannot see internal-user management', async ({
    page,
  }) => {
    await installBackofficeStubs(page, readOnlyUser);

    await page.goto('/backoffice/login');
    await page.getByLabel('Correo').fill('readonly@agendya.test');
    await page.getByLabel(/^Contraseña/).fill('supersecret123');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/backoffice$/);
    await expect(
      page.getByRole('link', { name: 'Usuarios internos' }),
    ).not.toBeVisible();

    // Guards against navigating there directly, too.
    await page.goto('/backoffice/internal-users');
    await expect(page).toHaveURL(/\/backoffice$/);
  });

  test('an unauthenticated visitor is sent to the Backoffice login, not the customer one', async ({
    page,
  }) => {
    await page.goto('/backoffice');
    await expect(page).toHaveURL(/\/backoffice\/login$/);
    await expect(
      page.getByText('Acceso solo para el equipo interno'),
    ).toBeVisible();
  });
});

async function logIn(page: import('@playwright/test').Page) {
  await page.goto('/backoffice/login');
  await page.getByLabel('Correo').fill('support@agendya.test');
  await page.getByLabel(/^Contraseña/).fill('supersecret123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();
}

test.describe('Backoffice — UX/a11y hardening', () => {
  test('on a phone, the avatar opens an account menu that can log out', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installBackofficeStubs(page, supportUser);
    await logIn(page);

    const avatar = page.getByRole('button', {
      name: 'Cuenta de Support Agent',
    });
    await avatar.click();
    const menu = page.getByRole('dialog', { name: 'Cuenta' });
    await expect(menu).toContainText('Soporte');
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(avatar).toBeFocused();

    await avatar.click();
    await menu.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/backoffice\/login$/);
  });

  test('the new-ticket dialog traps focus, labels its fields and closes on Escape', async ({
    page,
  }) => {
    await installBackofficeStubs(page, supportUser);
    await logIn(page);
    await page.getByRole('link', { name: 'Tickets' }).click();

    const trigger = page.getByRole('button', { name: 'Nuevo ticket' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo ticket' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Profesional')).toBeFocused();
    await expect(dialog.getByLabel('Asunto')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('a failed list request explains itself and offers a retry', async ({
    page,
  }) => {
    await installBackofficeStubs(page, supportUser);
    let fail = true;
    await page.route(
      new RegExp(`${API_URL}/backoffice/tickets(\\?.*)?$`),
      (route) =>
        fail
          ? route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: '{}',
            })
          : route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(ticketList),
            }),
    );
    await logIn(page);
    await page.getByRole('link', { name: 'Tickets' }).click();

    await expect(page.getByRole('alert')).toContainText(
      'Error al cargar los tickets.',
    );
    fail = false;
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(
      page.getByText('No llegó la notificación de una cita'),
    ).toBeVisible();
  });

  test('the ticket queue pages past the first API page', async ({ page }) => {
    await installBackofficeStubs(page, supportUser);
    await page.route(
      new RegExp(`${API_URL}/backoffice/tickets(\\?.*)?$`),
      (route) => {
        const cursor = new URL(route.request().url()).searchParams.get(
          'cursor',
        );
        const body: TicketListResponse = cursor
          ? {
              items: [
                {
                  ...ticketList.items[0],
                  id: 'ticket-2',
                  subject: 'Ticket de la segunda página',
                },
              ],
              nextCursor: null,
            }
          : { ...ticketList, nextCursor: 'cursor-1' };
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(body),
        });
      },
    );
    await logIn(page);
    await page.getByRole('link', { name: 'Tickets' }).click();

    await expect(
      page.getByText('No llegó la notificación de una cita'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cargar más' }).click();
    await expect(page.getByText('Ticket de la segunda página')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cargar más' })).toBeHidden();
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`dashboard and ticket queue pass axe in the ${theme} theme`, async ({
      page,
    }) => {
      await page.addInitScript((t) => {
        window.localStorage.setItem(
          'agendya-backoffice-theme',
          JSON.stringify({ state: { manualTheme: t }, version: 0 }),
        );
      }, theme);
      await installBackofficeStubs(page, supportUser);
      await logIn(page);

      const audit = async () => {
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const summary = results.violations
          .map(
            (v) =>
              `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
          )
          .join('\n');
        expect(results.violations, summary).toEqual([]);
      };

      await audit();
      await page.getByRole('link', { name: 'Tickets' }).click();
      await expect(
        page.getByText('No llegó la notificación de una cita'),
      ).toBeVisible();
      await audit();
    });
  }
});
