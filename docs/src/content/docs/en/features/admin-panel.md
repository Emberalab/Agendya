---
title: Admin Panel
description: >-
  Closed-beta access list, per-plan feature catalog, and subscription changes
  from Super Admin.
---

`/dashboard/admin` is only shown to an account with
`Professional.role = SUPER_ADMIN`. The API requires JWT + `SuperAdminGuard`.
An independent professional hitting that path is sent back to
`/dashboard/profile`.

Role is assigned **on register** when a `PlatformAccessEmail` row has
`access = SUPER_ADMIN`. Login does not escalate or downgrade role.

## Registrations

Lists **every** `Professional` account (email, business, `accessStatus`, plan,
trial, created date). The **Prueba** column shows "Activa · hasta …" or
"Terminó el …" from `trial.active`, computed server-side. **Accept** sets `APPROVED` and upserts `ALLOWLISTED` on
`PlatformAccessEmail`. **Decline** sets `DECLINED` (the row is not deleted).
You cannot decline a Super Admin.

This tab is the source of truth for who signed up. The access list below is
still for inviting emails **before** they register.

## Access list

`PlatformAccessEmail` (`ALLOWLISTED` | `SUPER_ADMIN`). On Railway
`production`/`dev` this is who may register; local/CI is open. See
[Authentication](/en/features/authentication/).

- List, create (lowercased email), change grant, delete. Each row includes
  the `Professional.plan` when that email already registered (`null` = list
  only), plus `billingInterval` (monthly/annual), `planStartedAt` (purchased)
  and `planExpiresAt` (expires) when the cycle came from a Wompi payment.
- Deleting a grant also sets `accessStatus = PENDING` on an existing account
  (does not delete the `Professional`; they lose dashboard access).
- You cannot downgrade or delete yourself (`403`).
- You cannot leave zero `SUPER_ADMIN` grants (`400`), via PATCH or DELETE.
- Changing a grant to `SUPER_ADMIN` does **not** promote an existing account.

## Features by plan

Read-only view of `FEATURE_CATALOG` (`@agendya/types`). Not persisted and not
editable in the panel. `enforced: true` today only on `maxServices` and
`maxBookingsPerMonth`.

## Prices and net

**Prices** tab: what the professional pays, Wompi’s cut, and our net. Source:
`packages/types/src/plans/billing.ts`. The first charge is the Wompi Widget
on Profile; recurring charges are not wired yet.

Assumed rate: Wompi Advanced aggregator, **2.65% + COP $700 + 19% VAT on the
fee**. Basic was mocked at $19,900; list price is **$21,900 / month** so net
stays at or above that. Paying the year upfront (Basic **$254,900**) saves
**$7,900** versus 12 monthly charges.

Methods: card, Nequi, Bancolombia. After a failed charge the paid plan stays
**3 days**; without `APPROVED` it drops to Free. Super Admin can still assign
a plan by hand.

## Change plan

The search box suggests accounts as you type, from **3 characters**
(`ADMIN_SEARCH_MIN_CHARS`). It matches email or business name,
case-insensitively, up to 10 results. Each suggestion shows the plan and a
**Prueba** badge when a trial is active. Navigate with ↑/↓ and Enter. Enter
with nothing highlighted, or **Buscar**, does the exact email lookup.

Once an account is picked, it PATCHes `plan` only. Does not touch
`role`. The JWT does not carry plan: the professional sees the change on the
next `GET /professionals/me`. Services are locked or unlocked for the
**effective** plan, so an active trial is never cut down.

## Trial period

A **full-access** trial (`TRIAL_PLAN` = `BUSINESS`) for
`TRIAL_DURATION_DAYS` = **30 days**, for selected accounts. Both constants
live in `packages/types/src/plans/trial.ts`. Managed in the **Plan y prueba**
tab, below "Cambiar plan", after looking the account up.

- **Owner:** the commercial account is the `Professional`. The trial is two
  fields, `trialStartedAt` and `trialEndsAt`. It never touches `plan`, which
  stays the billed plan.
- **Effective plan:** `effectivePlan()` returns `TRIAL_PLAN` while
  `trialStartedAt <= now < trialEndsAt`, and `plan` otherwise. Every API
  limit (services, bookings per month, usage alerts) and the profile
  (`effectivePlan`, `trial`, `monthlyBookingLimit`) go through it. The
  frontend never derives access from its own clock.
- **Length:** exactly 30 × 24 h from activation (a UTC instant), like paid
  periods. DST does not affect it. Dates are displayed in the professional's
  time zone.
- **Expiry:** writes nothing. Once `trialEndsAt` passes the account is FREE,
  whether or not anyone logs in. `TrialExpiryScheduler` (hourly) only
  re-applies the service limit to trials that ended in the last 7 days.
  Extra services become `planLocked` (paused, hidden from the public page).
  **Nothing is deleted:** no bookings, services or schedules.
- **Paid plan:** a purchase during the trial is stored and applies once the
  trial ends. During the trial the higher of the two wins.
- **Once only:** a set `trialStartedAt` means the trial was used. Repeating
  it needs an explicit `allowRepeat: true` from the admin.

Actions (all validated server-side, no dates from the client):

- **Grant**: `409` if one is active, or if it was already used without
  `allowRepeat`. `400` if the account is not approved or its plan is already
  `BUSINESS`. `403` for your own account.
- **Extend**: adds 1–`TRIAL_MAX_EXTENSION_DAYS` (30) days to the current
  end. Active trials only.
- **End**: sets `trialEndsAt = now` and applies the billed plan's limits
  right away.

Each action writes a `TrialEvent` row (who, when, previous and new end,
note) in the same transaction. An `updateMany` conditioned on the state that
was read stops a double grant from a double click or two admins at once.
The account detail shows the latest 20 events.

The professional sees an informational banner while the trial is active,
and in Perfil › Tu plan when it ends and what happens next. There is no
advance-warning email or notification yet.

## Endpoints

All: JWT + `SUPER_ADMIN`.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/admin/allowlist` | `AllowlistEntry[]` |
| `POST` | `/admin/allowlist` | `createAllowlistEntrySchema` · `409` if the email exists |
| `PATCH` | `/admin/allowlist/:email` | `{ access }` · `403`/`400` per the rules above |
| `DELETE` | `/admin/allowlist/:email` | `{ deleted: true }` |
| `GET` | `/admin/registrations` | `RegistrationEntry[]` (includes `trial`, `active` computed server-side) |
| `PATCH` | `/admin/registrations/:email` | `{ status: "APPROVED" \| "DECLINED" }` · `403` if declining a Super Admin |
| `GET` | `/admin/professionals?q=` | `searchProfessionalsQuerySchema` (`q` ≥ 3 chars) · `{ id, email, businessName, plan, trialActive }[]`, max 10 · `400` if `q` is too short |
| `GET` | `/admin/professionals/:email` | `{ id, email, businessName, slug, plan, billingInterval, planExpiresAt, effectivePlan, trial, trialHistory }` · `404` |
| `PATCH` | `/admin/professionals/:email/plan` | `{ plan }` (`planSchema`) · `404` |
| `POST` | `/admin/professionals/:email/trial` | `grantTrialSchema` `{ allowRepeat?, note? }` · `201` same object · `400`/`403`/`404`/`409` |
| `POST` | `/admin/professionals/:email/trial/extend` | `extendTrialSchema` `{ days: 1–30, note? }` · `409` without an active trial |
| `POST` | `/admin/professionals/:email/trial/end` | `endTrialSchema` `{ note? }` · `409` without an active trial |
