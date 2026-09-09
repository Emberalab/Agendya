import type { Notification } from '@agendya/types';
import { expect, test } from '../../fixtures/test';
import { STORAGE_STATE } from '../../utils/auth-state';
import { makeAgendaBookings } from '../../fixtures/data';

test.use({ storageState: STORAGE_STATE });

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: '00000000-0000-4000-8000-00000000beef',
    type: 'APPOINTMENT_CREATED',
    title: 'Nueva cita',
    body: 'Carla Nueva reservó Corte premium · 10 sept 2026, 1:30 p. m.',
    data: {
      bookingId: '00000000-0000-4000-8000-0000000000b9',
      customerName: 'Carla Nueva',
      serviceName: 'Corte premium',
      startAt: '2099-09-10T18:30:00.000Z',
    },
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const bell = (page: import('@playwright/test').Page) =>
  page
    .getByRole('button', { name: /^Notificaciones/ })
    .filter({ visible: true })
    .first();

test('customer booking → toast, bell count, centre entry, survives reload, opens the booking', async ({
  page,
  api,
}) => {
  const agenda = makeAgendaBookings();
  const target = agenda[0];
  api.setAgenda(agenda);
  // A notification that was already persisted before this session (offline case),
  // pointing at a real booking in the agenda.
  api.emitNotification(
    makeNotification({
      body: `${target.customerName} reservó ${target.serviceName}`,
      data: {
        bookingId: target.id,
        customerName: target.customerName,
        serviceName: target.serviceName,
        startAt: target.startAt,
      },
    }),
  );

  await page.goto('/dashboard/agenda');
  await expect(page.getByRole('heading', { name: 'Tu agenda' })).toBeVisible();

  // 4. Toast appears with no navigation / refresh.
  await expect(
    page.getByRole('region', { name: 'Notificaciones' }).getByText('Nueva cita'),
  ).toBeVisible();

  // 5. Bell unread count reflects it.
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 1 sin leer');

  // 6. Notification shows in the centre.
  await bell(page).click();
  const dialog = page.getByRole('dialog', { name: 'Notificaciones' });
  await expect(dialog.getByText('Nueva cita')).toBeVisible();
  await expect(
    dialog.getByText(`${target.customerName} reservó ${target.serviceName}`),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  // 7-8. Reload — the entry is still there (served from the persisted feed).
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tu agenda' })).toBeVisible();
  await expect(bell(page)).toHaveAccessibleName('Notificaciones, 1 sin leer');
  await bell(page).click();
  const item = page
    .getByRole('dialog', { name: 'Notificaciones' })
    .getByRole('button', { name: /^Sin leer\. Nueva cita\./ });
  await expect(item).toBeVisible();

  // 9. Activating it marks it read and opens the detail *inside the panel* —
  // no route change, panel stays open.
  await item.click();
  const panel = page.getByRole('dialog', { name: 'Notificaciones' });
  await expect(
    panel.getByRole('heading', { name: 'Detalle de la cita' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\/agenda$/);
  await expect(bell(page)).toHaveAccessibleName('Notificaciones');

  // ← returns to the list without closing the panel.
  await panel.getByRole('button', { name: 'Volver a notificaciones' }).click();
  await expect(
    panel.getByRole('heading', { name: 'Notificaciones' }),
  ).toBeVisible();

  // 10. "Ver en la agenda" performs the original deep-link + opens the drawer;
  // the agenda then strips the params from the URL.
  await panel.getByRole('button', { name: /Nueva cita\./ }).first().click();
  await panel.getByRole('button', { name: 'Ver en la agenda →' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Detalle de la cita' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\/agenda$/);
});

test('delete a read notification (with undo) and bulk-delete the rest', async ({
  page,
  api,
}) => {
  api.setAgenda(makeAgendaBookings());
  api.seedNotifications([
    makeNotification({
      id: '00000000-0000-4000-8000-00000000aaa1',
      readAt: null,
      title: 'Nueva cita',
      body: 'Sin leer',
    }),
    makeNotification({
      id: '00000000-0000-4000-8000-00000000aaa2',
      readAt: '2026-09-01T00:00:00.000Z',
      title: 'Cita leída uno',
      body: 'Leída 1',
    }),
    makeNotification({
      id: '00000000-0000-4000-8000-00000000aaa3',
      readAt: '2026-09-01T00:00:00.000Z',
      title: 'Cita leída dos',
      body: 'Leída 2',
    }),
  ]);

  await page.goto('/dashboard/agenda');
  await expect(page.getByRole('heading', { name: 'Tu agenda' })).toBeVisible();
  await bell(page).click();
  const panel = page.getByRole('dialog', { name: 'Notificaciones' });

  // Unread rows have no delete control.
  await expect(
    panel.getByRole('button', { name: 'Eliminar notificación: Nueva cita' }),
  ).toHaveCount(0);

  // Delete one read notification → it slides out and disappears; an undo toast
  // is offered. The slide is contained — it must not widen the page.
  await panel
    .getByRole('button', { name: 'Eliminar notificación: Cita leída uno' })
    .click();
  await expect(panel.getByText('Cita leída uno')).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'Notificaciones' }).getByText(
      'Notificación eliminada',
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);

  // Bulk-delete the remaining read notification behind a confirmation.
  await panel.getByRole('button', { name: 'Eliminar leídas' }).click();
  const confirm = page.getByRole('dialog', {
    name: '¿Eliminar notificaciones leídas?',
  });
  await confirm.getByRole('button', { name: 'Eliminar' }).click();

  await expect(panel.getByText('Cita leída dos')).toHaveCount(0);
  // The unread one survives; the bulk action is gone.
  await expect(
    panel.getByRole('button', { name: /^Sin leer\. Nueva cita\./ }),
  ).toBeVisible();
  await expect(
    panel.getByRole('button', { name: 'Eliminar leídas' }),
  ).toHaveCount(0);

  // X still closes the whole panel.
  await panel.getByRole('button', { name: 'Cerrar notificaciones' }).click();
  await expect(panel).toBeHidden();
});

test('individual delete works with no slide when motion is reduced', async ({
  page,
  api,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  api.setAgenda(makeAgendaBookings());
  api.seedNotifications([
    makeNotification({
      id: '00000000-0000-4000-8000-00000000bbb1',
      readAt: null,
      title: 'Nueva cita',
      body: 'Sin leer',
    }),
    makeNotification({
      id: '00000000-0000-4000-8000-00000000bbb2',
      readAt: '2026-09-01T00:00:00.000Z',
      title: 'Cita leída',
      body: 'Leída',
    }),
  ]);

  await page.goto('/dashboard/agenda');
  await expect(page.getByRole('heading', { name: 'Tu agenda' })).toBeVisible();
  await bell(page).click();
  const panel = page.getByRole('dialog', { name: 'Notificaciones' });

  await panel
    .getByRole('button', { name: 'Eliminar notificación: Cita leída' })
    .click();

  // Removed straight away, same undo affordance, no animation involved.
  await expect(panel.getByText('Cita leída')).toHaveCount(0);
  await expect(
    page
      .getByRole('region', { name: 'Notificaciones' })
      .getByText('Notificación eliminada'),
  ).toBeVisible();
  await expect(
    panel.getByRole('button', { name: /^Sin leer\. Nueva cita\./ }),
  ).toBeVisible();
});

test('deep link opens the booking in calendar view too', async ({ page, api }) => {
  const agenda = makeAgendaBookings();
  const target = agenda[0];
  api.setAgenda(agenda);
  api.emitNotification(
    makeNotification({
      data: {
        bookingId: target.id,
        customerName: target.customerName,
        serviceName: target.serviceName,
        startAt: target.startAt,
      },
    }),
  );

  await page.goto('/dashboard/agenda');
  await expect(page.getByRole('heading', { name: 'Tu agenda' })).toBeVisible();
  await page.getByRole('button', { name: 'Calendario' }).click();

  const toast = page.getByRole('region', { name: 'Notificaciones' });
  await toast.getByText('Nueva cita').click();

  await expect(page.getByText('Detalle de la cita')).toBeVisible();
});

test('does not duplicate the toast or the centre row while the SSE client reconnects', async ({
  page,
  api,
}) => {
  api.setAgenda(makeAgendaBookings());
  api.emitNotification(makeNotification());

  await page.goto('/dashboard/agenda');
  await expect(
    page.getByRole('region', { name: 'Notificaciones' }).getByText('Nueva cita'),
  ).toBeVisible();

  // The stub re-serves the same SSE frame on every reconnect; the dashboard
  // must de-duplicate by notification id.
  await page.waitForTimeout(2500);
  await expect(
    page.getByRole('region', { name: 'Notificaciones' }).getByText('Nueva cita'),
  ).toHaveCount(1);

  await bell(page).click();
  await expect(
    page.getByRole('dialog', { name: 'Notificaciones' }).getByText('Nueva cita'),
  ).toHaveCount(1);
});

test('empty state when there is nothing to show', async ({ page, api }) => {
  api.setAgenda(makeAgendaBookings());
  api.seedNotifications([]);

  await page.goto('/dashboard/agenda');
  await expect(page.getByRole('heading', { name: 'Tu agenda' })).toBeVisible();
  await expect(bell(page)).toHaveAccessibleName('Notificaciones');

  await bell(page).click();
  await expect(
    page.getByRole('dialog', { name: 'Notificaciones' }).getByText('No tienes notificaciones'),
  ).toBeVisible();
});
