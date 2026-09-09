import type { Page } from '@playwright/test';
import { expect, test } from '../../fixtures/test';
import { PUBLIC_SLUG } from '../../fixtures/data';

/**
 * The booking wizard's primary CTA lives at the bottom of the "Tu reserva"
 * summary. On a phone that sits below a tall stepper + business card + step
 * content, so `MobileStickyCta` mirrors the action in a bottom bar that hides
 * itself (via IntersectionObserver) whenever the real button is on screen.
 *
 * Keyboard-focus behaviour (bar hides while a field is focused) is covered by
 * the `MobileStickyCta` unit test; the custom date picker makes the details
 * step brittle to drive here.
 */

const BAR = 'mobile-sticky-cta';

async function openWizard(page: Page) {
  await page.goto(`/${PUBLIC_SLUG}`);
  await page.getByRole('button', { name: 'Reservar cita' }).click();
  await expect(page.getByText('Elige un servicio')).toBeVisible();
}

test.describe('mobile — sticky booking CTA', () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test('A: shows while the real "Continuar" is below the fold', async ({
    page,
  }) => {
    await openWizard(page);

    const sticky = page.getByTestId(BAR);
    await expect(sticky).toHaveAttribute('data-state', 'shown');

    // The sticky bar is on screen; the real CTA is not.
    await expect(sticky).toBeInViewport();
    await expect(sticky.locator('button')).toBeInViewport();
    await expect(
      page.getByRole('button', { name: /Continuar/ }),
    ).not.toBeInViewport();
  });

  test('B + C: hides when the real CTA enters view, returns when it leaves', async ({
    page,
  }) => {
    await openWizard(page);
    const sticky = page.getByTestId(BAR);
    const realCta = page.getByRole('button', { name: /Continuar/ });

    await expect(sticky).toHaveAttribute('data-state', 'shown');

    await realCta.scrollIntoViewIfNeeded();
    await expect(realCta).toBeInViewport();
    await expect(sticky).toHaveAttribute('data-state', 'hidden');

    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await expect(realCta).not.toBeInViewport();
    await expect(sticky).toHaveAttribute('data-state', 'shown');
  });

  test('D + F: mirrors the disabled state; updates the moment a service is picked', async ({
    page,
  }) => {
    await openWizard(page);
    const stickyButton = page.getByTestId(BAR).locator('button');
    const realCta = page.getByRole('button', { name: /Continuar/ });

    await expect(realCta).toBeDisabled();
    await expect(stickyButton).toBeDisabled();

    await page.getByText('Corte de cabello').click();

    await expect(realCta).toBeEnabled();
    await expect(stickyButton).toBeEnabled();
  });

  test('runs the wizard’s own action, and keeps working on the next step', async ({
    page,
  }) => {
    await openWizard(page);
    await page.getByText('Corte de cabello').click();

    // Advance from step 1 using the sticky CTA only.
    await page.getByTestId(BAR).locator('button').click();
    await expect(
      page.getByRole('heading', { name: '¿Dónde quieres recibir el servicio?' }),
    ).toBeVisible();

    // Same interaction model on step 2: disabled until a choice, then enabled.
    const stickyButton = page.getByTestId(BAR).locator('button');
    await expect(stickyButton).toBeDisabled();
    await page.getByText('En el establecimiento').click();
    await expect(stickyButton).toBeEnabled();
  });

  test('H: stays clear of the iOS home indicator via safe-area inset', async ({
    page,
  }) => {
    await openWizard(page);
    const style = await page.getByTestId(BAR).getAttribute('style');
    expect(style).toContain('env(safe-area-inset-bottom)');
  });

  test('exposes no duplicate control to assistive tech', async ({ page }) => {
    await openWizard(page);
    // Only the real button is in the accessibility tree.
    await expect(page.getByRole('button', { name: /Continuar/ })).toHaveCount(1);
    await expect(page.getByTestId(BAR)).toHaveAttribute('aria-hidden', 'true');
  });
});

test.describe('desktop — layout unchanged', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('J: no sticky bar on desktop; summary CTA is visible in the rail', async ({
    page,
  }) => {
    await openWizard(page);
    await expect(page.getByTestId(BAR)).toBeHidden();
    await expect(
      page.getByRole('button', { name: /Continuar/ }),
    ).toBeVisible();
  });
});
