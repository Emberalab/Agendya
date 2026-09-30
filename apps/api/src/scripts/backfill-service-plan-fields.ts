#!/usr/bin/env tsx
/**
 * Applies the plan service limit to every professional whose plan has one
 * (e.g. FREE accounts that had more services before limits existed).
 * `planEnabledAt` itself is backfilled by migration
 * 20260928040000_backfill_service_plan_enabled_at.
 *
 * Usage (from apps/api):
 *   npx tsx src/scripts/backfill-service-plan-fields.ts            # dry run
 *   DRY_RUN=false npx tsx src/scripts/backfill-service-plan-fields.ts
 *
 * Idempotent: a second run changes nothing.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PLAN_SERVICE_LIMITS, PLANS, effectivePlan } from '@agendya/types';
import {
  enforceServiceLimit,
  resolveServicePlanChange,
} from '../modules/services/service-plan-limit';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const DRY_RUN = process.env.DRY_RUN !== 'false';

async function main() {
  console.log(`Applying plan service limits (DRY_RUN: ${DRY_RUN})`);

  const limitedPlans = PLANS.filter(
    (plan) => PLAN_SERVICE_LIMITS[plan] !== null,
  );
  const professionals = await prisma.professional.findMany({
    where: { plan: { in: limitedPlans } },
    select: {
      id: true,
      email: true,
      plan: true,
      trialStartedAt: true,
      trialEndsAt: true,
    },
  });

  let changedCount = 0;
  for (const professional of professionals) {
    // Trial-aware: an active trial must not be locked down to the billed plan.
    const plan = effectivePlan(professional);
    const services = await prisma.service.findMany({
      where: { professionalId: professional.id, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, planLocked: true, planEnabledAt: true },
    });
    const { lockIds, enable } = resolveServicePlanChange(
      services,
      PLAN_SERVICE_LIMITS[plan],
    );
    const unlockCount = enable.filter(
      (e) => services.find((s) => s.id === e.id)?.planLocked,
    ).length;
    if (lockIds.length === 0 && unlockCount === 0) continue;

    changedCount++;
    console.log(
      `  ${professional.email} (${plan}): lock ${lockIds.length}, unlock ${unlockCount}`,
    );
    if (!DRY_RUN) {
      await prisma.$transaction((tx) =>
        enforceServiceLimit(tx, professional.id, plan),
      );
    }
  }

  console.log(
    `${changedCount} of ${professionals.length} professionals ${DRY_RUN ? 'would change' : 'changed'}.`,
  );
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
