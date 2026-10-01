import { expect, test } from '../../fixtures/test';
import { STORAGE_STATE } from '../../utils/auth-state';

test.use({ storageState: STORAGE_STATE });

test('moves between the four dashboard sections from the sidebar', async ({
  page,
}) => {
  await page.goto('/dashboard/profile');
  await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible();

  const sidebar = page.getByRole('complementary');

  await sidebar.getByRole('link', { name: 'Servicios' }).click();
  await expect(page).toHaveURL(/\/dashboard\/services$/);
  await expect(page.getByRole('heading', { name: 'Servicios' })).toBeVisible();

  await sidebar.getByRole('link', { name: 'Horario' }).click();
  await expect(page).toHaveURL(/\/dashboard\/schedule$/);
  await expect(
    page.getByRole('heading', { name: 'Horario Semanal' }),
  ).toBeVisible();

  await sidebar.getByRole('link', { name: 'Agenda' }).click();
  await expect(page).toHaveURL(/\/dashboard\/agenda$/);
  await expect(page.getByRole('heading', { name: 'Tu agenda' })).toBeVisible();

  await sidebar.getByRole('link', { name: 'Perfil' }).click();
  await expect(page).toHaveURL(/\/dashboard\/profile$/);
  await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible();
});

test('toggles dark mode from the sidebar and remembers it across reloads', async ({
  page,
}) => {
  await page.goto('/dashboard/profile');

  const toggle = page
    .getByRole('complementary')
    .getByRole('switch', { name: /tema/i });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');

  await toggle.click();

  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // The dashboard shell picks up the dark surface token.
  await expect(page.getByRole('complementary')).toHaveCSS(
    'background-color',
    'rgb(22, 27, 44)',
  );

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(
    page.getByRole('complementary').getByRole('switch', { name: /tema/i }),
  ).toHaveAttribute('aria-checked', 'true');
});

test.describe('on a mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('toggles dark mode from the mobile top bar', async ({ page }) => {
    await page.goto('/dashboard/profile');

    // The desktop sidebar (and its own toggle) stays in the DOM but hidden
    // below the `lg` breakpoint; scope to the one actually on screen.
    const toggle = page
      .getByRole('switch', { name: /tema/i })
      .filter({ visible: true });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test('logging out returns to the login screen', async ({ page }) => {
  await page.goto('/dashboard/profile');

  await page
    .getByRole('complementary')
    .getByRole('button', { name: 'Cerrar sesión' })
    .click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('heading', { name: 'Inicia sesión' }),
  ).toBeVisible();
});

test.describe('below the lg breakpoint (phone / tablet / installed PWA)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the avatar opens an account menu that can log out', async ({
    page,
  }) => {
    await page.goto('/dashboard/agenda');
    await expect(
      page.getByRole('heading', { name: 'Tu agenda' }),
    ).toBeVisible();

    // The desktop sidebar (and its logout button) is hidden at this width.
    await expect(page.getByRole('complementary')).toBeHidden();

    // Icon-only "Nueva cita" still has an accessible name on mobile.
    await expect(
      page.getByRole('button', { name: 'Nueva cita' }),
    ).toBeVisible();

    const avatar = page.getByRole('button', { name: /^Cuenta de / });
    await avatar.click();
    const menu = page.getByRole('dialog', { name: 'Cuenta' });
    await expect(menu).toBeVisible();

    // Escape closes it and returns focus to the avatar.
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(avatar).toBeFocused();

    await avatar.click();
    await menu.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('the page never scrolls horizontally', async ({ page }) => {
    for (const path of [
      '/dashboard/agenda',
      '/dashboard/services',
      '/dashboard/schedule',
      '/dashboard/profile',
    ]) {
      await page.goto(path);
      await page.getByRole('main').waitFor();
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(0);
    }
  });
});
