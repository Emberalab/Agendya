import type {
  AgendaBooking,
  AuthUser,
  ProfessionalProfile,
  PublicProfessional,
  ScheduleException,
  Service,
  WorkingHour,
} from '@agendya/types';
import { makeFakeJwt } from '../utils/jwt';

/**
 * The single professional every authenticated spec runs as. Values can be
 * overridden from the environment so a CI job can point at its own fixtures
 * without touching source.
 */
export const TEST_USER: AuthUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: process.env.E2E_USER_EMAIL ?? 'e2e@agendya.test',
  businessName: process.env.E2E_USER_BUSINESS_NAME ?? 'Barbería E2E',
  slug: 'barberia-e2e',
};

export const TEST_ACCESS_TOKEN =
  process.env.E2E_ACCESS_TOKEN ??
  makeFakeJwt({ sub: TEST_USER.id, email: TEST_USER.email });

const ISO = '2026-01-01T00:00:00.000Z';

export function makeProfile(
  overrides: Partial<ProfessionalProfile> = {},
): ProfessionalProfile {
  return {
    id: TEST_USER.id,
    email: TEST_USER.email,
    businessName: TEST_USER.businessName,
    slug: TEST_USER.slug,
    category: 'Barbería',
    photoUrl: null,
    logoUrl: null,
    coverImageUrl: null,
    brandColor: '#4F46E5',
    description: 'Cortes clásicos y modernos en el centro de la ciudad.',
    timezone: 'America/Bogota',
    cancellationPolicyHours: 24,
    plan: 'BASIC',
    bookingsThisMonth: 12,
    monthlyBookingLimit: 100,
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

function makeService(
  overrides: Partial<Service> & Pick<Service, 'id'>,
): Service {
  return {
    name: 'Servicio',
    description: null,
    durationMinutes: 30,
    priceCents: 2_000_000,
    isActive: true,
    homeServiceEnabled: false,
    homeDurationMinutes: null,
    homePriceCents: null,
    sortOrder: 0,
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  };
}

/** Two services — deliberately under the BASIC plan limit of 3. */
export function makeServices(): Service[] {
  return [
    makeService({
      id: '00000000-0000-4000-8000-0000000000a1',
      name: 'Corte de cabello',
      description: 'Corte clásico o moderno con acabado a navaja.',
      durationMinutes: 40,
      priceCents: 3_500_000,
      sortOrder: 0,
    }),
    makeService({
      id: '00000000-0000-4000-8000-0000000000a2',
      name: 'Arreglo de barba',
      description: 'Perfilado y toalla caliente.',
      durationMinutes: 20,
      priceCents: 1_800_000,
      sortOrder: 1,
    }),
  ];
}

export function makeWorkingHours(): WorkingHour[] {
  const weekdays: WorkingHour['dayOfWeek'][] = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
  ];
  return weekdays.map((dayOfWeek, index) => ({
    id: `00000000-0000-4000-8000-0000000000b${index}`,
    dayOfWeek,
    startMinute: 9 * 60,
    endMinute: 18 * 60,
  }));
}

export function makeScheduleExceptions(): ScheduleException[] {
  return [];
}

/**
 * ISO start/end for `hour:00` local time `daysFromNow` days out. `daysFromNow: 0`
 * keeps a booking inside every agenda range; a couple of days out clears the
 * 24-hour cancellation window so the "Cancelar cita" action stays enabled.
 */
function bookingAt(
  daysFromNow: number,
  hour: number,
): {
  start: string;
  end: string;
} {
  const start = new Date();
  start.setDate(start.getDate() + daysFromNow);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + 30 * 60_000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function makeAgendaBookings(): AgendaBooking[] {
  const first = bookingAt(2, 14);
  const second = bookingAt(0, 16);
  return [
    {
      id: '00000000-0000-4000-8000-0000000000c1',
      serviceId: '00000000-0000-4000-8000-0000000000a1',
      serviceName: 'Corte de cabello',
      durationMinutes: 30,
      customerName: 'Ana Gómez',
      customerEmail: 'ana@example.com',
      customerPhone: '+57 300 1234567',
      startAt: first.start,
      endAt: first.end,
      status: 'CONFIRMED',
      cancellationPolicyHours: 24,
      canReschedule: true,
      createdAt: ISO,
      cancelledAt: null,
      cancelledBy: null,
    },
    {
      id: '00000000-0000-4000-8000-0000000000c2',
      serviceId: '00000000-0000-4000-8000-0000000000a2',
      serviceName: 'Arreglo de barba',
      durationMinutes: 30,
      customerName: 'Bruno Díaz',
      customerEmail: 'bruno@example.com',
      customerPhone: '+57 301 7654321',
      startAt: second.start,
      endAt: second.end,
      status: 'PENDING',
      cancellationPolicyHours: 24,
      canReschedule: false,
      createdAt: ISO,
      cancelledAt: null,
      cancelledBy: null,
    },
  ];
}

export const PUBLIC_SLUG = 'maria-belleza';

export function makePublicProfessional(): PublicProfessional {
  return {
    businessName: 'María Belleza',
    slug: PUBLIC_SLUG,
    category: 'Peluquería',
    photoUrl: null,
    logoUrl: null,
    coverImageUrl: null,
    brandColor: '#4F46E5',
    description: 'Especialista en color y cortes de precisión.',
    services: [
      {
        id: '00000000-0000-4000-8000-0000000000d1',
        name: 'Corte de cabello',
        description: 'Corte y peinado.',
        durationMinutes: 30,
        priceCents: 3_000_000,
        homeServiceEnabled: true,
        homeDurationMinutes: 45,
        homePriceCents: 5_000_000,
      },
      {
        id: '00000000-0000-4000-8000-0000000000d2',
        name: 'Manicure',
        description: null,
        durationMinutes: 45,
        priceCents: 2_000_000,
        homeServiceEnabled: false,
        homeDurationMinutes: null,
        homePriceCents: null,
      },
    ],
  };
}

/** A couple of bookable slots for the public availability endpoint. */
export function makeAvailabilitySlots(date: string): string[] {
  return [
    `${date}T14:00:00.000Z`,
    `${date}T14:30:00.000Z`,
    `${date}T15:00:00.000Z`,
  ];
}
