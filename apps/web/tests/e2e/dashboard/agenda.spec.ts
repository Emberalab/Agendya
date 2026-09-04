import { expect, test } from '../../fixtures/test';
import { STORAGE_STATE } from '../../utils/auth-state';
import { makeAgendaBookings } from '../../fixtures/data';

test.use({ storageState: STORAGE_STATE });

// The desktop row prints the customer name on its own; the mobile card (hidden
// at this viewport) prints "Name · phone", so exact matching keeps assertions
// pinned to the visible desktop row.

test('lists the upcoming bookings from the API', async ({ page }) => {
  await page.goto('/dashboard/agenda');

  await expect(page.getByRole('heading', { name: 'Tu agenda' })).toBeVisible();
  await expect(page.getByText('Ana Gómez', { exact: true })).toBeVisible();
  await expect(page.getByText('Bruno Díaz', { exact: true })).toBeVisible();
});

test('filters the list by booking status', async ({ page }) => {
  await page.goto('/dashboard/agenda');
  await expect(page.getByText('Ana Gómez', { exact: true })).toBeVisible();

  await page.getByRole('combobox').selectOption({ label: 'Pendientes' });

  await expect(page.getByText('Bruno Díaz', { exact: true })).toBeVisible();
  await expect(page.getByText('Ana Gómez', { exact: true })).toHaveCount(0);
});

test('cancels a confirmed booking from the actions menu', async ({
  page,
  api,
}) => {
  // Keep a single booking on the agenda so the row is unambiguous. It is two
  // days out, past the 24h cancellation window, so "Cancelar cita" is enabled.
  const [confirmed] = makeAgendaBookings();
  api.setAgenda([confirmed]);

  await page.goto('/dashboard/agenda');
  await expect(page.getByText('Ana Gómez', { exact: true })).toBeVisible();

  await page
    .getByRole('button', { name: 'Acciones' })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Cancelar cita' }).click();

  await expect
    .poll(() =>
      api.calls.some(
        (call) =>
          call.method === 'PATCH' && /\/bookings\/.+\/cancel$/.test(call.path),
      ),
    )
    .toBe(true);

  // The row's status badge flips to "Cancelada" once the refetch lands. Exact
  // matching avoids the "Canceladas" filter <option>; the visible filter picks
  // the desktop badge over the hidden mobile-card one.
  await expect(
    page
      .getByText('Cancelada', { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
});
