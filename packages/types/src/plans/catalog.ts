import { z } from 'zod';

export const PLANS = ['FREE', 'BASIC', 'ADVANCED', 'BUSINESS'] as const;
export const planSchema = z.enum(PLANS);
export type Plan = z.infer<typeof planSchema>;

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: 'Gratuito',
  BASIC: 'Básico',
  ADVANCED: 'Avanzado',
  BUSINESS: 'Negocios',
};

const PLAN_RANK: Record<Plan, number> = {
  FREE: 0,
  BASIC: 1,
  ADVANCED: 2,
  BUSINESS: 3,
};

export function planRank(plan: Plan): number {
  return PLAN_RANK[plan];
}

export const FEATURE_IDS = [
  'maxServices',
  'maxBookingsPerMonth',
  'publicPage',
  'basicSchedule',
  'advancedSchedule',
  'hideAgendyaBrand',
  'emailNotifications',
  'prioritySupport',
  'automaticScheduling',
  'smsNotifications',
  'reports',
  'multipleProfessionals',
] as const;

export type FeatureId = (typeof FEATURE_IDS)[number];

type LimitFeature = {
  kind: 'limit';
  label: string;
  missingLabel: string;
  /** `null` = unlimited. */
  limits: Record<Plan, number | null>;
  /** Enforced in the API today. */
  enforced: boolean;
};

type ToggleFeature = {
  kind: 'toggle';
  label: string;
  missingLabel: string;
  minPlan: Plan;
  enforced: boolean;
};

export type FeatureDefinition = LimitFeature | ToggleFeature;

/**
 * Single source of truth for subscription features.
 * Flip `minPlan` / `limits` here to enable or tighten a capability.
 *
 * Toggle: `minPlan` is the cheapest plan that includes the capability.
 * `minPlan: FREE` means every plan has it — it is not the FREE service cap.
 * Limit: `limits[plan]` is that plan's cap (`null` = unlimited).
 * `enforced: false` means catalogued for UI/upsell only; the API does not cut it yet.
 */
export const FEATURE_CATALOG: Record<FeatureId, FeatureDefinition> = {
  maxServices: {
    kind: 'limit',
    label: 'Servicios',
    missingLabel: 'Más servicios en tu catálogo',
    limits: { FREE: 3, BASIC: 10, ADVANCED: null, BUSINESS: null },
    enforced: true,
  },
  maxBookingsPerMonth: {
    kind: 'limit',
    label: 'Reservas al mes',
    missingLabel: 'Más reservas cada mes',
    limits: { FREE: 100, BASIC: null, ADVANCED: null, BUSINESS: null },
    enforced: true,
  },
  publicPage: {
    kind: 'toggle',
    label: 'Página pública',
    missingLabel: 'Página pública de reservas',
    minPlan: 'FREE',
    enforced: false,
  },
  basicSchedule: {
    kind: 'toggle',
    label: 'Gestión de horarios',
    missingLabel: 'Gestión de horarios',
    minPlan: 'FREE',
    enforced: false,
  },
  advancedSchedule: {
    kind: 'toggle',
    label: 'Horario avanzado',
    missingLabel: 'Horario avanzado',
    minPlan: 'BASIC',
    enforced: false,
  },
  hideAgendyaBrand: {
    kind: 'toggle',
    label: 'Página sin marca Agendya',
    missingLabel: 'Página pública sin publicidad',
    minPlan: 'BASIC',
    enforced: false,
  },
  emailNotifications: {
    kind: 'toggle',
    label: 'Notificaciones por correo',
    missingLabel: 'Notificaciones por correo',
    minPlan: 'BASIC',
    enforced: false,
  },
  prioritySupport: {
    kind: 'toggle',
    label: 'Soporte prioritario',
    missingLabel: 'Soporte prioritario',
    minPlan: 'BASIC',
    enforced: false,
  },
  automaticScheduling: {
    kind: 'toggle',
    label: 'Programación automática',
    missingLabel: 'Programación automática',
    minPlan: 'ADVANCED',
    enforced: false,
  },
  smsNotifications: {
    kind: 'toggle',
    label: 'Notificaciones por SMS',
    missingLabel: 'Notificaciones por SMS',
    minPlan: 'ADVANCED',
    enforced: false,
  },
  reports: {
    kind: 'toggle',
    label: 'Informes y estadísticas',
    missingLabel: 'Informes y estadísticas',
    minPlan: 'ADVANCED',
    enforced: false,
  },
  multipleProfessionals: {
    kind: 'toggle',
    label: 'Varios profesionales',
    missingLabel: 'Varios profesionales en un negocio',
    minPlan: 'BUSINESS',
    enforced: false,
  },
};

export function getLimit(plan: Plan, featureId: FeatureId): number | null {
  const feature = FEATURE_CATALOG[featureId];
  if (feature.kind !== 'limit') {
    throw new Error(`${featureId} is not a limit feature`);
  }
  return feature.limits[plan];
}

export function hasFeature(plan: Plan, featureId: FeatureId): boolean {
  const feature = FEATURE_CATALOG[featureId];
  if (feature.kind === 'toggle') {
    return planRank(plan) >= planRank(feature.minPlan);
  }
  return true;
}

export const PLAN_SERVICE_LIMITS: Record<Plan, number | null> = {
  FREE: getLimit('FREE', 'maxServices'),
  BASIC: getLimit('BASIC', 'maxServices'),
  ADVANCED: getLimit('ADVANCED', 'maxServices'),
  BUSINESS: getLimit('BUSINESS', 'maxServices'),
};

export const PLAN_MONTHLY_BOOKING_LIMITS: Record<Plan, number | null> = {
  FREE: getLimit('FREE', 'maxBookingsPerMonth'),
  BASIC: getLimit('BASIC', 'maxBookingsPerMonth'),
  ADVANCED: getLimit('ADVANCED', 'maxBookingsPerMonth'),
  BUSINESS: getLimit('BUSINESS', 'maxBookingsPerMonth'),
};

function isBetterLimit(candidate: number | null, current: number | null): boolean {
  if (candidate === null) {
    return current !== null;
  }
  if (current === null) {
    return false;
  }
  return candidate > current;
}

export function missingFeatureIds(plan: Plan): FeatureId[] {
  return FEATURE_IDS.filter((id) => {
    const feature = FEATURE_CATALOG[id];
    if (feature.kind === 'toggle') {
      return !hasFeature(plan, id);
    }
    const current = feature.limits[plan];
    return PLANS.some(
      (other) =>
        planRank(other) > planRank(plan) &&
        isBetterLimit(feature.limits[other], current),
    );
  });
}

export type MissingFeature = { id: FeatureId; label: string };

function rotate<T>(items: T[], seed: string): T[] {
  if (items.length === 0) {
    return items;
  }
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  const offset = hash % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

export function isoWeekKey(date = new Date()): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Up to `count` capabilities the current plan lacks.
 * Usage (near a limit) wins; the rest rotate by professional + week
 * so "Te falta" is not a fixed list.
 */
export function pickMissingFeatures(
  plan: Plan,
  ctx: {
    serviceCount?: number;
    bookingsThisMonth?: number;
    seed?: string;
    now?: Date;
    count?: number;
  } = {},
): MissingFeature[] {
  const count = ctx.count ?? 3;
  const missing = missingFeatureIds(plan);
  if (missing.length === 0) {
    return [];
  }

  const urgent: FeatureId[] = [];
  const serviceLimit = getLimit(plan, 'maxServices');
  if (
    missing.includes('maxServices') &&
    serviceLimit != null &&
    ctx.serviceCount != null &&
    ctx.serviceCount >= serviceLimit - 1
  ) {
    urgent.push('maxServices');
  }
  const bookingLimit = getLimit(plan, 'maxBookingsPerMonth');
  if (
    missing.includes('maxBookingsPerMonth') &&
    bookingLimit != null &&
    ctx.bookingsThisMonth != null &&
    ctx.bookingsThisMonth >= Math.ceil(bookingLimit * 0.8)
  ) {
    urgent.push('maxBookingsPerMonth');
  }

  const seed = `${ctx.seed ?? ''}:${isoWeekKey(ctx.now)}`;
  const rest = rotate(
    missing.filter((id) => !urgent.includes(id)),
    seed,
  );
  return [...urgent, ...rest].slice(0, count).map((id) => ({
    id,
    label: FEATURE_CATALOG[id].missingLabel,
  }));
}
