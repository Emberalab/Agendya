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

- List, create (lowercased email), change grant, delete.
- You cannot downgrade or delete yourself (`403`).
- You cannot leave zero `SUPER_ADMIN` grants (`400`), via PATCH or DELETE.
- Changing a grant to `SUPER_ADMIN` does **not** promote an existing account.

## Features by plan

Read-only view of `FEATURE_CATALOG` (`@agendya/types`). Not persisted and not
editable in the panel. `enforced: true` today only on `maxServices` and
`maxBookingsPerMonth`.

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
