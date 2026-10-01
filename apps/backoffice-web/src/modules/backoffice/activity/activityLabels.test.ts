import { describe, expect, it } from 'vitest';
import type { ActivityEvent } from '@agendya/types';
import {
  afterSignupLabel,
  calendarDaysBetween,
  describeEvent,
  eventLink,
  formatWeek,
  relativeDays,
  zonedStartOfDay,
} from './activityLabels';

const TZ = 'America/Bogota';

function event(overrides: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    type: 'ACCOUNT_CREATED',
    category: 'ACCOUNT',
    actor: 'PROFESSIONAL',
    entityType: null,
    entityId: null,
    subject: null,
    metadata: null,
    backfilled: false,
    occurredAt: '2026-09-15T15:00:00.000Z',
    ...overrides,
  };
}

describe('describeEvent', () => {
  it('describes a reschedule with both slots in the professional time zone', () => {
    const result = describeEvent(
      event({
        type: 'BOOKING_RESCHEDULED',
        category: 'APPOINTMENT',
        subject: 'Corte clásico',
        metadata: {
          from: '2026-09-17T15:00:00.000Z',
          to: '2026-09-18T20:30:00.000Z',
        },
      }),
      TZ,
    );
    expect(result.title).toBe('Cita reprogramada');
    expect(result.tone).toBe('warning');
    // 15:00Z → 10:00 and 20:30Z → 15:30 in Bogotá.
    expect(result.details[0]).toMatch(/^Corte clásico · .*10:00 → .*15:30$/);
  });

  it('tells online bookings from manual ones', () => {
    const online = describeEvent(
      event({ type: 'BOOKING_CREATED', metadata: { source: 'ONLINE' } }),
      TZ,
    );
    const manual = describeEvent(
      event({ type: 'BOOKING_CREATED', metadata: { source: 'MANUAL' } }),
      TZ,
    );
    expect(online.title).toBe('Recibió una cita en línea');
    expect(manual.title).toBe('Creó una cita manualmente');
  });

  it('lists service changes with formatted values and hides free text', () => {
    const result = describeEvent(
      event({
        type: 'SERVICE_UPDATED',
        subject: 'Barba',
        metadata: {
          changes: {
            priceCents: { from: 2000000, to: 2500000 },
            durationMinutes: { from: 30, to: 45 },
            description: { changed: true },
          },
        },
      }),
      TZ,
    );
    expect(result.title).toBe('Servicio "Barba" editado');
    expect(result.details).toEqual([
      'Precio: $20.000 → $25.000',
      'Duración: 30 min → 45 min',
      'Descripción actualizado',
    ]);
  });

  it('reads a lone isActive change as deactivation', () => {
    const result = describeEvent(
      event({
        type: 'SERVICE_UPDATED',
        subject: 'Barba',
        metadata: { changes: { isActive: { from: true, to: false } } },
      }),
      TZ,
    );
    expect(result.title).toBe('Servicio "Barba" desactivado');
  });

  it('distinguishes a first schedule setup from a reconstructed one', () => {
    const week = [
      {
        dayOfWeek: 'MONDAY',
        blocks: [
          [480, 720],
          [840, 1080],
        ],
      },
    ];
    const first = describeEvent(
      event({
        type: 'WORKING_HOURS_UPDATED',
        metadata: { before: [], after: week },
      }),
      TZ,
    );
    expect(first.title).toBe('Configuró su horario');
    expect(first.details).toEqual(['Lunes 08:00–12:00, 14:00–18:00']);

    const rebuilt = describeEvent(
      event({
        type: 'WORKING_HOURS_UPDATED',
        backfilled: true,
        metadata: { before: null, after: week },
      }),
      TZ,
    );
    expect(rebuilt.title).toBe('Horario semanal vigente');
  });

  it('degrades gracefully when metadata is missing', () => {
    expect(
      describeEvent(event({ type: 'BOOKING_CANCELLED', metadata: null }), TZ),
    ).toEqual({
      title: 'Cita cancelada',
      details: [],
      tone: 'danger',
    });
  });
});

describe('helpers', () => {
  it('links only appointment events', () => {
    expect(eventLink(event({ entityType: 'Booking', entityId: 'b-1' }))).toBe(
      '/backoffice/appointments/b-1',
    );
    expect(
      eventLink(event({ entityType: 'Service', entityId: 's-1' })),
    ).toBeNull();
  });

  it('starts a filter day at local midnight in the professional time zone', () => {
    expect(zonedStartOfDay('2026-09-15', TZ).toISOString()).toBe(
      '2026-09-15T05:00:00.000Z',
    );
    expect(zonedStartOfDay('2026-09-15', 'UTC').toISOString()).toBe(
      '2026-09-15T00:00:00.000Z',
    );
  });

  it('formats the week and relative days', () => {
    expect(formatWeek([{ dayOfWeek: 'SUNDAY', blocks: [[600, 780]] }])).toEqual(
      ['Domingo 10:00–13:00'],
    );
    const now = new Date('2026-09-30T12:00:00.000Z');
    expect(relativeDays('2026-09-30T08:00:00.000Z', now)).toBe('hoy');
    expect(relativeDays('2026-09-29T08:00:00.000Z', now)).toBe('ayer');
    expect(relativeDays('2026-09-25T12:00:00.000Z', now)).toBe('hace 5 días');
  });

  it('counts milestone days as calendar days in the professional time zone', () => {
    // Registered Sep 14 21:48 in Bogotá (Sep 15 02:48 UTC); service Sep 30.
    const days = calendarDaysBetween(
      '2026-09-15T02:48:18.692Z',
      '2026-09-30T19:18:11.480Z',
      TZ,
    );
    expect(days).toBe(16);
    expect(afterSignupLabel(days)).toBe('16 días después del registro');
    expect(afterSignupLabel(0)).toBe('el mismo día del registro');
    expect(afterSignupLabel(1)).toBe('1 día después del registro');
  });
});
