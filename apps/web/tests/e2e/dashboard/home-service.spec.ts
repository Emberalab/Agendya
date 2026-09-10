import type { Notification } from '@agendya/types';
import { expect, test } from '../../fixtures/test';
import { STORAGE_STATE } from '../../utils/auth-state';
import {
  makeAgendaBookings,
  makeHomeServiceAgendaBooking,
} from '../../fixtures/data';

test.use({ storageState: STORAGE_STATE });

/** True when nothing on the page has pushed the document wider than the viewport. */
async function noHorizontalScroll(page: import('@playwright/test').Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
}

const LONG_ADDRESS =
  'Calle 10 #43C-20, Apartamento 502 Torre 1, Barrio El Poblado (Ref.: portón negro junto a la panadería, timbre 502)';

test('professional sees the customer address for an "a domicilio" booking', async ({
  page,
  api,
}) => {
  api.setAgenda([
    makeHomeServiceAgendaBooking({ customerAddress: LONG_ADDRESS }),
  ]);

  await page.goto('/dashboard/agenda');
  await page
    .getByRole('button', { name: 'Ver detalle' })
    .filter({ visible: true })
    .first()
    .click();

  const drawer = page.getByRole('dialog', { name: 'Detalle de la cita' });
  await expect(drawer.getByText('DOMICILIO', { exact: true })).toBeVisible();
  await expect(drawer.getByText('Servicio a domicilio', { exact: true })).toBeVisible();
  await expect(drawer.getByText(LONG_ADDRESS)).toBeVisible();

  expect(await noHorizontalScroll(page)).toBe(true);
});

test('the address wraps and never scrolls the page on a phone viewport', async ({
  page,
  api,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  api.setAgenda([
    makeHomeServiceAgendaBooking({ customerAddress: LONG_ADDRESS }),
  ]);

  await page.goto('/dashboard/agenda');
  await page
    .getByRole('button', { name: 'Ver detalle' })
    .filter({ visible: true })
    .first()
    .click();

  const drawer = page.getByRole('dialog', { name: 'Detalle de la cita' });
  await expect(drawer.getByText(LONG_ADDRESS)).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);
});

test('a non-home booking shows no address block at all', async ({
  page,
  api,
}) => {
  const [confirmed] = makeAgendaBookings();
  api.setAgenda([confirmed]);

  await page.goto('/dashboard/agenda');
  await page
    .getByRole('button', { name: 'Ver detalle' })
    .filter({ visible: true })
    .first()
    .click();

  const drawer = page.getByRole('dialog', { name: 'Detalle de la cita' });
  await expect(drawer.getByText('Observaciones')).toBeVisible();
  await expect(drawer.getByText('DOMICILIO', { exact: true })).toHaveCount(0);
  await expect(drawer.getByText('Servicio a domicilio', { exact: true })).toHaveCount(0);
});

test('a very long observation stays inside the drawer', async ({ page, api }) => {
  const wall = 'observaciónmuylarga'.repeat(30); // one ~540-char unbroken token
  const note = `${wall} y también una URL https://ejemplo.com/${'segmento-'.repeat(30)}`;
  api.setAgenda([makeHomeServiceAgendaBooking({ customerNote: note })]);

  await page.goto('/dashboard/agenda');
  await page
    .getByRole('button', { name: 'Ver detalle' })
    .filter({ visible: true })
    .first()
    .click();

  const drawer = page.getByRole('dialog', { name: 'Detalle de la cita' });
  // The whole note is in the DOM (not truncated)…
  await expect(drawer.getByText(wall, { exact: false })).toBeVisible();
  // …and it did not widen the page.
  expect(await noHorizontalScroll(page)).toBe(true);
});

test('a home-service notification flags "a domicilio" without carrying the address', async ({
  page,
  api,
}) => {
  api.setAgenda(makeAgendaBookings());

  const notification: Notification = {
    id: '00000000-0000-4000-8000-0000000000f7',
    type: 'APPOINTMENT_CREATED',
    title: 'Nueva cita a domicilio',
    body: 'Valentina reservó Corte a domicilio',
    data: {
      bookingId: '00000000-0000-4000-8000-0000000000c9',
      customerName: 'Valentina',
      serviceName: 'Corte a domicilio',
      startAt: '2099-09-10T18:30:00.000Z',
      atHome: true,
    },
    readAt: null,
    createdAt: new Date().toISOString(),
  };
  api.emitNotification(notification);

  await page.goto('/dashboard/agenda');
  await page
    .getByRole('button', { name: /^Notificaciones/ })
    .filter({ visible: true })
    .first()
    .click();

  const panel = page.getByRole('dialog', { name: 'Notificaciones' });
  await panel.getByRole('button', { name: /Nueva cita a domicilio\./ }).click();

  await expect(
    panel.getByRole('heading', { name: 'Detalle de la cita' }),
  ).toBeVisible();
  await expect(panel.getByText(/Servicio a domicilio\./)).toBeVisible();
  await expect(panel.getByText('A domicilio', { exact: true })).toBeVisible();
  // The address is never in the notification surface.
  await expect(panel.getByText(LONG_ADDRESS)).toHaveCount(0);
});
