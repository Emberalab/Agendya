# Agendya — System Design + UX/UI Audit (October 2026)

Scope: the professional-facing app (`apps/web`), its Super Admin panel (`/dashboard/admin`, same SPA), and the Backoffice (`apps/backoffice-web`). Light and dark themes, desktop / tablet / phone / installed PWA.

The main app is the visual source of truth. Status column: **Done** = implemented on this branch and covered by tests; **Open** = recommended, not implemented.

---

## 1. Current architecture

| Layer | Main app (`apps/web`) | Backoffice (`apps/backoffice-web`) |
| --- | --- | --- |
| Tokens | CSS custom properties in `src/main.scss` (`:root` + `html[data-theme='dark']`), **not** registered with Tailwind | Same names/values in a Tailwind `@theme` block (`src/styles/tailwind.css`), so `bg-surface`, `text-danger`… exist as utilities |
| Styling | Mostly inline `style={{…}}` reading `var(--…)` (~1,100 inline style objects) + some Tailwind layout classes + Moon Design System components | Tailwind utilities on tokens; small own component set (Button, Input, Select, Textarea, Card, Badge, BackLink) |
| Components | Moon (`Button`, `Input`, `Select`, `Textarea`, `FormGroup`, `Checkbox`, `Snackbar`) + many hand-rolled dialogs/menus + a generic `shared/components` set | Own components, no Moon |
| Theme | `data-theme` on `<html>`, pre-paint inline script, Zustand store, follows OS until manual override, live OS updates | Identical mechanism, own storage key |
| Fonts | Outfit (display), Plus Jakarta Sans (body), Inter (labels, "mono") | Same |

The theme architecture is sound: no flash of the wrong theme, system preference respected, manual override persisted, live OS changes honoured, Moon's `.dark-theme` class kept in sync. The token *vocabulary* is also good and AA-checked. The problems are in **adoption**: many components bypassed the tokens with light-only hex values, and a few token families (warning, success surfaces, elevation, control borders) didn't exist in the main app, so each screen invented its own.

---

## 2. Findings and plan

Legend — Theme: L / D / Both. Surface: App = professional app + public pages, Admin = Super Admin panel, BO = Backoffice. DS = becomes a reusable design-system change.

### P0 — Critical UX / accessibility / design problems

| # | Location | Problem | Why it matters | Theme | Surface | Solution | Cx | DS | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0-1 | `dashboard/DashboardLayout.tsx`, `Sidebar.tsx` | "Cerrar sesión" only existed in the desktop sidebar (`lg+`). Phones, tablets in portrait and the installed PWA had **no way to log out**. | Dead end; shared/borrowed devices stay signed in. | Both | App | Avatar in the mobile top bar opens an account menu (`MobileAccountMenu.tsx`) with profile link + logout; focus-trapped, Escape/outside-click close. | S | Yes | **Done** |
| P0-2 | `backoffice/dashboard/BackofficeLayout.tsx` | Same dead end in the Backoffice below `lg`. | Same. | Both | BO | Same pattern (`MobileAccountMenu.tsx`). | S | Yes | **Done** |
| P0-3 | `bookings/ContextMenu.tsx`, `services/components/ServiceRowMenu.tsx` | Destructive menu item hover was hardcoded `#FFF5F5`. In dark mode: a near-white flash with `#F87171` text (2.6:1). | Unreadable destructive action in dark mode. | D | App | `var(--color-danger-surface)`. | XS | — | **Done** |
| P0-4 | `support/SupportTicketsPage.tsx` | Ticket status pills used hand-picked pastels: 3.1–4.4:1 in light (fails AA); bright pastel chips in dark. Hue mapping differed from the Backoffice. | Status unreadable; same ticket looked different to support and to the professional. | Both | App | Token-based pills with the Backoffice's status→family mapping. | S | Yes | **Done** |
| P0-5 | `bookings/AgendaPage.tsx` | "Te quedan N citas este mes" and the near-limit counter used `#F59E0B` text: **2.15:1** on white. | Plan-limit warning is the one message that drives upgrade decisions. | L | App | `--color-warning` (5.0:1 light, 7.7:1 dark). | XS | Yes | **Done** |
| P0-6 | `bookings/CalendarGridView.tsx` | Month-grid "N citas" chip: `#EDF2FF` background with dark-theme `text-brand` → 2.7:1; on the selected cell, white chip + light indigo text → 2.7:1. | Primary calendar information unreadable in dark mode. | D | App | `--color-brand-surface`; selected-cell chip uses fill-strength brand. | XS | — | **Done** |
| P0-7 | `dashboard/PlanStatusBanner.tsx` | Grace/cancelled banner: light-only pastel bar across every page in dark mode; amber CTA white-on-`#D97706` = **3.2:1**. | Payment-critical CTA fails contrast. | Both | App | Warning/danger surface tokens + new `--color-warning-fill` (5.0:1). | S | Yes | **Done** |
| P0-8 | `auth/ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx` | Success/error banners: light pastel background with dark-theme secondary text → **2.0:1**. | The "check your email" / "password changed" confirmation is unreadable in dark mode. | D | App | Success/danger surface tokens. | XS | — | **Done** |
| P0-9 | `profile`, `support detail` | Slug-available text `#15803D` (3.4:1 on dark) and reply error `#DC2626` (3.5:1 on dark). | Form feedback fails AA in dark. | D | App | `--color-success` / `--color-danger`. | XS | — | **Done** |
| P0-10 | ProfilePage, ServiceFormPage, BlockFormDrawer, BlockedDatesManager, Agenda mobile search | Hand-rolled inputs set inline `outline: 'none'` with no replacement: **no visible keyboard focus** (WCAG 2.4.7). | Keyboard users can't tell where they are on the two most-edited forms. | Both | App | Global `:focus-visible` 2px brand ring for non-Moon text fields in `main.scss` (beats inline style, inset so it isn't clipped). | S | Yes | **Done** |
| P0-11 | `bookings/AgendaPage.tsx` | Below 640px "Nueva cita" is icon-only and the label span is `display:none` → **button has no accessible name**. | The primary action of the primary screen is silent to screen readers on phones. | Both | App | `aria-label="Nueva cita"`. | XS | — | **Done** |
| P0-12 | `publicBooking/BookingCancelPage.tsx` | Customer page reached from an email/WhatsApp link: "Cancelar reserva" cancelled **immediately on one tap**; date input had no accessible name; page was a generic gray/blue template (off-brand) with an emoji; date in the browser's locale (English on English phones). | Irreversible action without confirmation, on the page customers reach with the least context. | Both | App | Confirm dialog, Agendya tokens/typography, labelled input, `es-CO` date. | S | — | **Done** |
| P0-13 | Backoffice `TicketDetailPage`, `NewTicketButton` | Mutations (`reply`, `status`, `priority`, `assign`, `create`) failed **silently**: button re-enabled, no message. | A support agent believes a reply reached the professional when it didn't. | Both | BO | `InlineError` + `getBackofficeErrorMessage()` (Nest message → status fallback); draft kept on failure. | S | Yes | **Done** |
| P0-14 | Backoffice `Input` (+ web `Input`) | `<label htmlFor={props.id}>` but callers never pass `id` → fields like "Profesional" and "Asunto" had **no label association**. | Unlabelled form fields. | Both | BO / App | `useId()` fallback, `aria-invalid`, `aria-describedby` for error/helper. | XS | Yes | **Done** |

### P1 — High-value consistency problems

| # | Location | Problem | Why it matters | Theme | Surface | Solution | Cx | DS | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1-1 | `main.scss` | No warning, success-surface, elevation or control-border tokens in the main app (the Backoffice had warning/success). ~40 call sites hardcoded their own. | Root cause of most P0 colour bugs. | Both | App/BO | Added `--color-success-surface/-border`, `--color-warning/-surface/-border/-fill`, `--color-border-strong`, `--shadow-dialog`, `--shadow-drawer` in both apps with dark variants. Migrated every hardcoded status colour. | M | Yes | **Done** |
| P1-2 | Form controls (both apps) | Input/select/textarea borders used decorative `--color-border` (1.2:1 light, 1.4:1 dark). | WCAG 1.4.11 wants 3:1 for control boundaries; fields "disappear" in dark mode. | Both | All | `--color-border-strong` (3.3–3.7:1) for controls only; cards keep the soft border. | S | Yes | **Done** (Moon controls, Backoffice controls, Profile/Service/Schedule forms) |
| P1-3 | `main.scss` Moon overrides | Only `Input` was restyled. `Select`/`Textarea` kept Moon's 1px "info"-blue focus; the outline override also **erased the red error border** (specificity). | Three different focus/error looks in one form. | Both | App | One rule for Input/Select/Textarea: border-strong, 2px brand focus, 2px danger error (incl. `.moon-form-group-error` and `aria-invalid`). | S | Yes | **Done** |
| P1-4 | Dialogs/drawers (~14) | Shadows were hand-written slate at 0.14–0.22 alpha (invisible on dark); scrims were 0.3/0.35/0.75 variants. | Overlays had no depth in dark mode; inconsistent dimming. | D | App | `--shadow-dialog`, `--shadow-drawer`, `--overlay-scrim` everywhere. | S | Yes | **Done** |
| P1-5 | Admin panel (`admin/*`) | Six `window.confirm()` calls (plan change, allowlist delete/grant, accept/decline, trial grant/extend/end) + one in ProfilePage. | Unthemed browser chrome, can't mark destructive, some PWAs suppress it; inconsistent with the app's own dialogs. | Both | Admin/App | `ConfirmDialog` + promise-based `useConfirmDialog()`; destructive variant; specific titles and button labels. | M | Yes | **Done** |
| P1-6 | `admin/AdminPanel.tsx` | Tabs were plain buttons (no `tablist`/`aria-selected`/keyboard model); five tabs overflowed a 360px screen sideways; brand-coloured `text-3xl` h1 unlike every other page title. | Screen-reader/keyboard navigation of the main admin control; horizontal page scroll on phones. | Both | Admin | WAI-ARIA tabs (arrows, Home/End, roving tabindex), scrollable tablist, standard page-title style. | S | — | **Done** |
| P1-7 | `SuperAdminShell` | No skip link (the professional shell had one); logout was a 14px text-only link. | Inconsistent shell a11y. | Both | Admin | Skip link; bordered 40px logout button. | XS | — | **Done** |
| P1-8 | `apps/web/src/shared/components/{Button,Badge,Card,Input}` | Generic Tailwind template (`blue-600`, `gray-*`, `red-*`) instead of Agendya tokens. | The cancel/reschedule page looked like a different product. | Both | App | Rebuilt on tokens with the Backoffice's variant names and look. | S | Yes | **Done** |
| P1-9 | `legal/LegalPage.tsx` | Referenced 7 tokens that don't exist (`--color-bg-*`, `--radius-md/lg`, `--shadow-md`, `--font-heading`): no card, no radius, headings lost their font. "Volver" (`navigate(-1)`) is a dead end when opened from a link. | Public legal pages look broken. | Both | App | Real tokens; back falls back to `/`. | XS | — | **Done** |
| P1-10 | Moon typography | Moon's `text-*` utilities use `var(--font-default)` = "DM Sans" (never loaded). The existing override only matched bare class names, so `lg:text-sm` page subtitles rendered in **serif**. | Visible typographic glitch on most page subtitles at desktop width. | Both | App | `--font-default` pointed at Plus Jakarta Sans at `:root`. | XS | Yes | **Done** |
| P1-11 | Backoffice list pages | Dashboard, Tickets, Audit log, Internal users, Professional search handled only loading/data; a failed request rendered an empty card. | No error recovery for agents. | Both | BO | `LoadError` with "Reintentar"; queries no longer retry 4xx and retry 5xx once (errors appear in ~1s instead of ~7s). | S | Yes | **Done** |
| P1-12 | Backoffice Tickets + Audit log | Single `useQuery`, so lists silently stopped at the API's 30-item page; `nextCursor` ignored. | Older tickets and audit entries were unreachable. | Both | BO | `useInfiniteQuery` + shared `LoadMore`. | S | Yes | **Done** |
| P1-13 | Backoffice ticket composer | Unlabelled textarea; generic "Enviar" regardless of whether the message is an internal note or goes to the professional; visibility stayed on "customer-visible" after sending. | The one outward-facing, irreversible action in the Backoffice was ambiguous. | Both | BO | Label + placeholder + button text follow visibility ("Guardar nota interna" / "Enviar al profesional"); resets to internal note after each send. | XS | — | **Done** |
| P1-14 | Backoffice new-ticket modal | No focus trap, no Escape, no initial focus, no scroll on short screens. | Keyboard trap risk; unusable on small landscape phones. | Both | BO | Shared `useFocusTrap` (copied, per the no-shared-runtime rule), scrim click, `max-h` + scroll. | XS | Yes | **Done** |
| P1-15 | Backoffice professional search | Query lived in component state: open a 360 view, press back, search is gone. | Unexpected state reset in the most common support flow. | Both | BO | Query in `?q=`; min-length hint; error state. | XS | — | **Done** |
| P1-16 | Backoffice 360 view | Raw enum values (`BASIC`, `MONDAY`). | Agents read internal codes. | Both | BO | `PLAN_LABELS`, `WEEKDAY_LABELS`. | XS | — | **Done** |
| P1-17 | Backoffice `Button` `secondary` | `bg-brand-secondary` (`#0f172a` in both themes) → invisible button on dark surface. | Broken variant in dark. | D | BO | Theme-inverting neutral (`text-primary` fill, `surface` text). | XS | Yes | **Done** |
| P1-18 | `ProfilePage.tsx` | Footer always said "Modificado por última vez hoy" (hardcoded). Save confirmation not announced. Error box used raw Tailwind red. | False information; silent success for screen readers. | Both | App | Real `updatedAt`; `role="status"`; tokens. | XS | — | **Done** |
| P1-19 | Global | No global `prefers-reduced-motion` handling (only a few components opted out); hover scales and width transitions still animated. | WCAG 2.3.3 / vestibular comfort. | Both | All | Global reduced-motion floor in both apps (durations → ~0, events still fire). | XS | Yes | **Done** |
| P1-20 | `index.html` viewport | `maximum-scale=1, user-scalable=no` blocks pinch zoom (WCAG 1.4.4). Documented as a deliberate product choice in the a11y spec. | Low-vision users can't zoom on Android (iOS ignores it). | Both | App | Remove `maximum-scale`/`user-scalable`; fix any input <16px that caused iOS focus-zoom instead. | XS | — | **Open — product decision** |

### P2 — Medium-value improvements (Open)

| # | Location | Problem | Solution | Cx | DS |
| --- | --- | --- | --- | --- | --- |
| P2-1 | `apps/web` tokens | Tokens aren't registered with Tailwind, which is why the app grew ~1,100 inline style objects. | Move the `main.scss` token block into a plain `@theme` in `styles/tailwind.css` (exactly what the Backoffice does) with the dark override under `:root[data-theme='dark']`. Then migrate screens opportunistically from `style={{}}` to utilities. | M | Yes |
| P2-2 | Typography | 24 distinct inline font sizes (9px → 34px, incl. 11.5px, 12.5px, 17px, 19px). Page titles: App 24/28px, Admin was 30px brand-coloured, Backoffice 20px. | Define a scale: display 28 / title 24 / section 18 / body 15 / small 13 / caption 12 / micro 11; operational surfaces (Admin, Backoffice) use title 22–24 and body 14. Remove 9–10px text (bottom-nav labels → 11px). | M | Yes |
| P2-3 | Buttons | Four button implementations: Moon `.moon-button`, hand-rolled `rounded-xl py-2.5` buttons (most CTAs), web `shared/components/Button`, Backoffice `Button`. Heights 32–48px, radii 8–12px. | Pick one size scale (36 / 44 / 48) and one radius (`--radius-control` for controls, `rounded-xl` only for full-width CTAs); route new CTAs through `Button`. | M | Yes |
| P2-4 | Radius | `rounded-lg` (94), `rounded-2xl` (80), `rounded-xl` (61), `rounded-3xl` (11) for similar containers. | Tokens: `--radius-control` 8, `--radius-card` 16, `--radius-dialog` 24. | S | Yes |
| P2-5 | Z-index | Ad-hoc layers: 10, 40, 50, 60, 80, 90, 100, 190, 200, 210, 1000. | `--z-nav 50`, `--z-toast 60`, `--z-drawer 100`, `--z-dialog 200`, `--z-confirm 210`, `--z-skip 1000`. | S | Yes |
| P2-6 | Dark elevation | Dialogs, menus and cards all use `--color-surface`; in dark, depth relies only on the scrim. | Add `--color-surface-elevated` (dark ≈ `#1D2337`) for dialogs/menus. | S | Yes |
| P2-7 | Admin home | `/dashboard` for a Super Admin is an interstitial "Hola, SuperAdmin" page with one button. | Redirect straight to `/dashboard/admin`. | XS | — |
| P2-8 | Admin tables | Registros / Lista de acceso: no search, filter or count; fixed `max-w-6xl` while the panel is `max-w-7xl`. | Search by email/business + status filter; consistent widths. | S | — |
| P2-9 | Backoffice widths | Pages use `max-w-3xl`, `4xl` or `5xl` arbitrarily. | One operational width (`max-w-5xl`) with a shared page header (title, description, actions). | S | Yes |
| P2-10 | Success feedback | Only realtime notifications use toasts; saves report success inline differently per screen (or not at all). | Use the existing `ToastHost` for save/delete success + `announce()`. | S | Yes |
| P2-11 | Booking cancel page | Shows times in the customer's browser time zone; the API response has no professional `timezone`. | Return the professional's timezone and format with it (same as the agenda). | S | — |
| P2-12 | `ThemeToggle` | Once toggled there's no way back to "follow system"; `aria-label` changes with state on a `role="switch"`. | Static label ("Tema oscuro"), optional "Sistema" choice. | S | — |

### P3 — Nice to have (Open)

- `services/ServiceRow.tsx` is dead code (no importers) — delete it.
- `apps/web` support list (`useMyTickets`) has the same 30-item cap as P1-12; unlikely to matter for one professional, same fix if it does.
- `--font-mono` is Inter, a proportional font; rename to `--font-label` when P2-1 lands. Its fallback was `monospace` (Courier whenever Google Fonts didn't load); now a sans stack — **done**.
- Kebab-case SVG props in `NotificationItem.tsx` produced React console errors — **done**.
- Backoffice audit log shows raw `entityType · entityId`; link to the entity instead.
- Bottom-nav labels are 10px in both apps (legible, but below the proposed scale).

---

## 3. Hardcoded colour classification (after this pass)

| Class | Examples | Action |
| --- | --- | --- |
| 1. Should use a design token | status pastels, `#F59E0B`, `#DC2626`, `#FFF5F5`, `#EDF2FF`, slate shadows/scrims, `#fff` on brand fills | **Migrated** (≈60 sites; none left outside classes 2–5) |
| 2. Intentional exception | `#1e1b4b` auth hero placeholder behind a photo; brand gradients on the public page | Kept |
| 3. Third-party requirement | Google "G" logo colours | Kept |
| 4. Dynamic / generated | professional `brandColor` default `#4F46E5`, hue slider gradient | Kept |
| 5. Decorative | `#FBBF24` rating stars, toggle-knob shadows | Kept |

---

## 4. Density

- **Main app** stays spacious: 15px inputs, 46px fields, cards with 20–24px padding, single primary action per screen.
- **Admin panel** is a configuration surface inside the main app's shell: same components, page-title scale, tables with horizontal scroll inside their card on phones.
- **Backoffice** is the densest: 14px controls, 36px buttons, list rows instead of cards, 20px titles. It now shares tokens, focus treatment, control borders, dialogs and error language with the main app, without adopting its spacing.

---

## 5. Validation

| Check | Result |
| --- | --- |
| `npm run verify` (lint → typecheck → test → build, all workspaces) | Pass. Lint warnings unchanged from baseline (13, all pre-existing) |
| Web unit tests (Vitest) | 202 passed (was 200; +2 for the new confirmation flows) |
| Backoffice unit tests | 25 passed |
| Web Playwright (incl. axe WCAG 2.2 AA, light + dark) | 104 passed. New: support status pills (both themes), admin panel axe (both themes), admin tabs keyboard model, no horizontal overflow at 360/390px, mobile account menu + logout |
| Backoffice Playwright | 10 passed. New: mobile account menu + logout, new-ticket dialog focus/labels/Escape, load error + retry, pagination, axe on dashboard + ticket queue (both themes) |
| Docs site build | Pass (`docs/src/content/docs/{,en/}frontend/design-system.md` document the token families) |
