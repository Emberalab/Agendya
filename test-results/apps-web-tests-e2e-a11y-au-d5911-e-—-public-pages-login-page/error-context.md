# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apps/web/tests/e2e/a11y/audit.spec.ts >> light theme — public pages >> login page
- Location: apps/web/tests/e2e/a11y/audit.spec.ts:49:5

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/login", waiting until "load"

```

# Test source

```ts
  1   | import AxeBuilder from '@axe-core/playwright';
  2   | import type { Page } from '@playwright/test';
  3   | import { expect, test } from '../../fixtures/test';
  4   | import { STORAGE_STATE } from '../../utils/auth-state';
  5   | import { PUBLIC_SLUG } from '../../fixtures/data';
  6   | 
  7   | /**
  8   |  * WCAG 2.2 AA automated audit. Runs axe-core against the rendered page (real
  9   |  * browser, real CSS cascade — this is what catches color-contrast, missing
  10  |  * accessible names, invalid ARIA, landmark and heading-order issues). It is a
  11  |  * floor, not a ceiling: things axe can't verify (focus trapping, Escape
  12  |  * behavior, logical focus order, restoring focus on close) are covered by the
  13  |  * interaction assertions in the other e2e specs instead.
  14  |  */
  15  | async function expectNoViolations(page: Page) {
  16  |   const results = await new AxeBuilder({ page })
  17  |     .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
  18  |     .analyze();
  19  | 
  20  |   const summary = results.violations
  21  |     .map(
  22  |       (v) =>
  23  |         `\n[${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} node(s))\n` +
  24  |         v.nodes
  25  |           .map((n) => `  ${n.target.join(' ')} :: ${n.failureSummary}`)
  26  |           .join('\n'),
  27  |     )
  28  |     .join('\n');
  29  | 
  30  |   expect(results.violations.length, summary).toBe(0);
  31  | }
  32  | 
  33  | /** Seeds an explicit manual theme choice the same way the app's own boot script reads it, before any app code runs. */
  34  | async function setTheme(page: Page, theme: 'light' | 'dark') {
  35  |   await page.addInitScript((t) => {
  36  |     window.localStorage.setItem(
  37  |       'agendya-theme',
  38  |       JSON.stringify({ state: { manualTheme: t }, version: 0 }),
  39  |     );
  40  |   }, theme);
  41  | }
  42  | 
  43  | for (const theme of ['light', 'dark'] as const) {
  44  |   test.describe(`${theme} theme — public pages`, () => {
  45  |     test.beforeEach(async ({ page }) => {
  46  |       await setTheme(page, theme);
  47  |     });
  48  | 
  49  |     test('login page', async ({ page }) => {
> 50  |       await page.goto('/login');
      |                  ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  51  |       await expect(
  52  |         page.getByRole('heading', { name: 'Inicia sesión' }),
  53  |       ).toBeVisible();
  54  |       await expectNoViolations(page);
  55  |     });
  56  | 
  57  |     test('register page', async ({ page }) => {
  58  |       await page.goto('/register');
  59  |       await expect(
  60  |         page.getByRole('heading', { name: 'Crea tu cuenta' }),
  61  |       ).toBeVisible();
  62  |       await expectNoViolations(page);
  63  |     });
  64  | 
  65  |     test('forgot-password page', async ({ page }) => {
  66  |       await page.goto('/forgot-password');
  67  |       await expectNoViolations(page);
  68  |     });
  69  | 
  70  |     test('login page with a validation error showing', async ({ page }) => {
  71  |       await page.goto('/login');
  72  |       await page.getByLabel('Correo electrónico *').fill('not-an-email');
  73  |       await page.getByLabel('Contraseña *').fill('x');
  74  |       await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  75  |       await expect(page.getByRole('alert')).toBeVisible();
  76  |       await expectNoViolations(page);
  77  |     });
  78  | 
  79  |     test('public booking landing page', async ({ page }) => {
  80  |       await page.goto(`/${PUBLIC_SLUG}`);
  81  |       await expect(
  82  |         page.getByRole('heading', { name: 'María Belleza' }),
  83  |       ).toBeVisible();
  84  |       await expectNoViolations(page);
  85  |     });
  86  | 
  87  |     test('public booking wizard, service step', async ({ page }) => {
  88  |       await page.goto(`/${PUBLIC_SLUG}`);
  89  |       await page.getByRole('button', { name: 'Reservar cita' }).click();
  90  |       await expect(page.getByText('Elige un servicio')).toBeVisible();
  91  |       await expectNoViolations(page);
  92  |     });
  93  |   });
  94  | 
  95  |   test.describe(`${theme} theme — dashboard`, () => {
  96  |     test.use({ storageState: STORAGE_STATE });
  97  |     test.beforeEach(async ({ page }) => {
  98  |       await setTheme(page, theme);
  99  |     });
  100 | 
  101 |     test('profile page', async ({ page }) => {
  102 |       await page.goto('/dashboard/profile');
  103 |       await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible();
  104 |       await expectNoViolations(page);
  105 |     });
  106 | 
  107 |     test('services page', async ({ page }) => {
  108 |       await page.goto('/dashboard/services');
  109 |       await expect(
  110 |         page.getByRole('heading', { name: 'Servicios' }),
  111 |       ).toBeVisible();
  112 |       await expectNoViolations(page);
  113 |     });
  114 | 
  115 |     test('services page — delete confirmation dialog open', async ({
  116 |       page,
  117 |     }) => {
  118 |       await page.goto('/dashboard/services');
  119 |       await page.getByText('Corte de cabello').first().waitFor();
  120 |       await page
  121 |         .getByRole('button', { name: 'Más acciones para Corte de cabello' })
  122 |         .click();
  123 |       await page.getByRole('button', { name: 'Eliminar servicio' }).click();
  124 |       await expect(
  125 |         page.getByRole('dialog', { name: 'Eliminar servicio' }),
  126 |       ).toBeVisible();
  127 |       await expectNoViolations(page);
  128 |     });
  129 | 
  130 |     test('agenda page', async ({ page }) => {
  131 |       await page.goto('/dashboard/agenda');
  132 |       await expect(page.getByRole('heading', { name: 'Tu agenda' })).toBeVisible();
  133 |       await expectNoViolations(page);
  134 |     });
  135 | 
  136 |     test('agenda page — appointment detail drawer open', async ({ page }) => {
  137 |       await page.goto('/dashboard/agenda');
  138 |       await page
  139 |         .getByRole('button', { name: 'Ver detalle' })
  140 |         .first()
  141 |         .click();
  142 |       await expect(
  143 |         page.getByRole('dialog', { name: 'Detalle de la cita' }),
  144 |       ).toBeVisible();
  145 |       await expectNoViolations(page);
  146 |     });
  147 | 
  148 |     test('schedule page', async ({ page }) => {
  149 |       await page.goto('/dashboard/schedule');
  150 |       await expect(
```