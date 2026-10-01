import type { Plan, Prisma } from '@prisma/client';
import { PLAN_SERVICE_LIMITS, effectivePlan } from '@agendya/types';

/**
 * Where-clause for services a customer can see and book: switched on by the
 * professional, included in their plan, and not deleted. Every public read
 * (profile, availability, booking creation) must go through this.
 */
export function bookableServiceWhere(
  professionalId: string,
): Prisma.ServiceWhereInput {
  return { professionalId, isActive: true, planLocked: false, deletedAt: null };
}

export interface ServicePlanSlot {
  id: string;
  planLocked: boolean;
  planEnabledAt: Date | null;
}

export interface ServicePlanChange {
  lockIds: string[];
  /** Ids to (re)enable, each with the `planEnabledAt` to store. */
  enable: { id: string; planEnabledAt: Date }[];
}

/**
 * Pure plan-limit resolution. `services` must be the non-deleted services in
 * catalog order (`sortOrder`, `createdAt`).
 *
 * - No limit, or fewer services than the limit: everything enabled.
 * - More enabled than the limit (a downgrade): keep the first N of the catalog
 *   and restamp their `planEnabledAt` in catalog order, so the later FIFO swap
 *   removes the first catalog entry first.
 * - Otherwise keep what is enabled and fill free slots with locked services in
 *   catalog order.
 */
export function resolveServicePlanChange(
  services: ServicePlanSlot[],
  limit: number | null,
  now: Date = new Date(),
): ServicePlanChange {
  const stamp = (index: number) => new Date(now.getTime() + index);
  const enabled = services.filter((s) => !s.planLocked);
  const locked = services.filter((s) => s.planLocked);

  if (limit === null || services.length <= limit) {
    return {
      lockIds: [],
      enable: locked.map((s, i) => ({ id: s.id, planEnabledAt: stamp(i) })),
    };
  }

  if (enabled.length > limit) {
    const keep = enabled.slice(0, limit);
    return {
      lockIds: enabled.slice(limit).map((s) => s.id),
      enable: keep.map((s, i) => ({ id: s.id, planEnabledAt: stamp(i) })),
    };
  }

  const fill = locked.slice(0, limit - enabled.length);
  return {
    lockIds: [],
    enable: fill.map((s, i) => ({ id: s.id, planEnabledAt: stamp(i) })),
  };
}

/**
 * Applies the service limit of `plan` to a professional. Prefer
 * {@link enforceEffectiveServiceLimit} on plan/trial transitions so an active
 * trial is never overridden by the billed plan.
 */
export async function enforceServiceLimit(
  tx: Prisma.TransactionClient,
  professionalId: string,
  plan: Plan,
): Promise<void> {
  const services = await tx.service.findMany({
    where: { professionalId, deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, planLocked: true, planEnabledAt: true },
  });

  const { lockIds, enable } = resolveServicePlanChange(
    services,
    PLAN_SERVICE_LIMITS[plan],
  );

  if (lockIds.length > 0) {
    await tx.service.updateMany({
      where: { id: { in: lockIds } },
      data: { planLocked: true },
    });
  }
  for (const { id, planEnabledAt } of enable) {
    await tx.service.update({
      where: { id },
      data: { planLocked: false, planEnabledAt },
    });
  }
}

/**
 * Re-reads the professional's billed plan and trial window inside `tx` and
 * applies the service limit of the *effective* plan. Call on every plan or
 * trial transition (payment, expiry jobs, admin plan change, trial
 * grant/end). Idempotent: running it on an already-consistent account writes
 * nothing. Returns the plan it enforced.
 */
export async function enforceEffectiveServiceLimit(
  tx: Prisma.TransactionClient,
  professionalId: string,
  now: Date = new Date(),
): Promise<Plan> {
  const account = await tx.professional.findUniqueOrThrow({
    where: { id: professionalId },
    select: { plan: true, trialStartedAt: true, trialEndsAt: true },
  });
  const plan = effectivePlan(account, now);
  await enforceServiceLimit(tx, professionalId, plan);
  return plan;
}
