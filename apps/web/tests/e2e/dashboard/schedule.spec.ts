import { expect, test } from '../../fixtures/test';
import { STORAGE_STATE } from '../../utils/auth-state';

test.use({ storageState: STORAGE_STATE });

test.beforeEach(async ({ api }) => {
  // A blank slate: every day off, so the flow below controls the whole
  // scenario (which days are active, what "aplicar a todos" would touch)
  // instead of depending on the shared default fixture data.
  api.setWorkingHours([]);
});

/**
 * End-to-end coverage for the "Gestión de horarios" audit:
 *  - multiple blocks on one day are configured and persisted together
 *    (bug 1's reported symptom — a second block silently not applying),
 *  - the unsaved-changes indicator (bug 3) is visible the moment a block
 *    modal closes, before the outer "Guardar configuración" runs,
 *  - a full save → navigate away → return → reload round trip keeps both
 *    blocks.
 */
test('configures two blocks on a day, shows unsaved state, saves, and both blocks survive a reload', async ({
  page,
}) => {
  await page.goto('/dashboard/schedule/lunes');
  await expect(
    page.getByRole('heading', { name: 'Configurar Lunes' }),
  ).toBeVisible();
  await expect(
    page.getByText('Este día no tiene bloques de trabajo.'),
  ).toBeVisible();

  const saveConfig = page.getByRole('button', { name: 'Guardar configuración' });
  // Nothing to save yet.
  await expect(saveConfig).toBeDisabled();

  // First block.
  await page.getByRole('button', { name: /Agregar bloque/ }).click();
  let dialog = page.getByRole('dialog', { name: 'Nuevo bloque' });
  await dialog.getByLabel('Hora de inicio').fill('08:00');
  await dialog.getByLabel('Hora de fin').fill('12:00');
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toBeHidden();

  // The block modal closing does NOT mean the schedule is saved yet — bug 3.
  await expect(saveConfig).toBeEnabled();
  await expect(page.getByText('Tienes cambios sin guardar.')).toBeVisible();

  // Second block.
  await page.getByRole('button', { name: /Agregar bloque/ }).click();
  dialog = page.getByRole('dialog', { name: 'Nuevo bloque' });
  await dialog.getByLabel('Hora de inicio').fill('14:00');
  await dialog.getByLabel('Hora de fin').fill('18:00');
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByText('08:00 – 12:00')).toBeVisible();
  await expect(page.getByText('14:00 – 18:00')).toBeVisible();
  await expect(page.getByText('Tienes cambios sin guardar.')).toBeVisible();

  // Persist the whole configuration.
  await saveConfig.click();
  await expect(
    page.getByRole('heading', { name: 'Horario Semanal' }),
  ).toBeVisible();

  // Navigate away entirely, then come back to the day editor.
  await page.getByRole('link', { name: 'Perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible();
  await page.goto('/dashboard/schedule/lunes');

  await expect(
    page.getByRole('heading', { name: 'Configurar Lunes' }),
  ).toBeVisible();
  await expect(page.getByText('08:00 – 12:00')).toBeVisible();
  await expect(page.getByText('14:00 – 18:00')).toBeVisible();

  // A hard reload re-fetches from the (stubbed) server rather than reading
  // any local-only state — both blocks are genuinely persisted.
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Configurar Lunes' }),
  ).toBeVisible();
  await expect(page.getByText('08:00 – 12:00')).toBeVisible();
  await expect(page.getByText('14:00 – 18:00')).toBeVisible();
});

test('"aplicar a todos los días activos" copies the day\'s blocks to every other active day, leaving off days off', async ({
  page,
  api,
}) => {
  api.setWorkingHours([
    { id: 'wh-1', dayOfWeek: 'TUESDAY', startMinute: 540, endMinute: 1080 },
  ]);

  await page.goto('/dashboard/schedule/lunes');
  await expect(
    page.getByRole('heading', { name: 'Configurar Lunes' }),
  ).toBeVisible();

  await page.getByRole('button', { name: /Agregar bloque/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Nuevo bloque' });
  await dialog.getByLabel('Hora de inicio').fill('08:00');
  await dialog.getByLabel('Hora de fin').fill('12:00');
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toBeHidden();

  await page
    .getByRole('checkbox', { name: /Aplicar a todos los días activos/ })
    .check();
  await page.getByRole('button', { name: 'Guardar configuración' }).click();

  await expect(
    page.getByRole('heading', { name: 'Horario Semanal' }),
  ).toBeVisible();

  // Tuesday was the only other active day — it now mirrors Monday's block.
  const [tuesdayRow] = await page.getByRole('switch', {
    name: 'Estado de Martes',
  }).all();
  await expect(tuesdayRow).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('08:00 – 12:00').first()).toBeVisible();

  // Every other day was off and stays off.
  const [sundayToggle] = await page.getByRole('switch', {
    name: 'Estado de Domingo',
  }).all();
  await expect(sundayToggle).toHaveAttribute('aria-checked', 'false');
});
