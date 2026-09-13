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

## Access list

`PlatformAccessEmail` (`ALLOWLISTED` | `SUPER_ADMIN`). On Railway
`production`/`dev` this is who may register; local/CI is open. See
[Authentication](/en/features/authentication/).

- List, create (lowercased email), change grant, delete. Each row includes
  the `Professional.plan` when that email already registered (`null` = list
  only), plus `billingInterval` (monthly/annual), `planStartedAt` (purchased)
  and `planExpiresAt` (expires) when the cycle came from a Wompi payment.
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

Looks up a `Professional` by email and PATCHes `plan` only. Does not touch
`role`. The JWT does not carry plan: the professional sees the change on the
next `GET /professionals/me`.

## Endpoints

All: JWT + `SUPER_ADMIN`.

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/admin/allowlist` | `AllowlistEntry[]` |
| `POST` | `/admin/allowlist` | `createAllowlistEntrySchema` · `409` if the email exists |
| `PATCH` | `/admin/allowlist/:email` | `{ access }` · `403`/`400` per the rules above |
| `DELETE` | `/admin/allowlist/:email` | `{ deleted: true }` |
| `GET` | `/admin/professionals/:email` | `{ id, email, businessName, slug, plan }` · `404` |
| `PATCH` | `/admin/professionals/:email/plan` | `{ plan }` (`planSchema`) · `404` |
