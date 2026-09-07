import type { Booking, Professional } from '@prisma/client';
import {
  isModifiable,
  isPast,
  meetsCancellationWindow,
} from './booking-policy';

const NOW = new Date('2026-08-01T00:00:00.000Z');

function bookingAt(startAt: string, status: Booking['status'] = 'CONFIRMED') {
  return { startAt: new Date(startAt), status } as Booking;
}

function professionalWithPolicy(cancellationPolicyHours: number) {
  return { cancellationPolicyHours } as Professional;
}

describe('booking-policy', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW.getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isPast', () => {
    it('is true for an instant at or before now', () => {
      expect(isPast(NOW)).toBe(true);
      expect(isPast(new Date('2026-07-31T23:59:59.000Z'))).toBe(true);
    });

    it('is false for a future instant', () => {
      expect(isPast(new Date('2026-08-01T00:00:01.000Z'))).toBe(false);
    });
  });

  describe('meetsCancellationWindow', () => {
    it('is true when the start is at least the policy hours away', () => {
      expect(
        meetsCancellationWindow(new Date('2026-08-02T00:00:00.000Z'), 24),
      ).toBe(true);
    });

    it('is false inside the minimum-notice window', () => {
      expect(
        meetsCancellationWindow(new Date('2026-08-01T10:00:00.000Z'), 24),
      ).toBe(false);
    });

    it('treats a zero-hour policy as always satisfied for future starts', () => {
      expect(
        meetsCancellationWindow(new Date('2026-08-01T00:30:00.000Z'), 0),
      ).toBe(true);
    });
  });

  describe('isModifiable', () => {
    it('is true for a confirmed future booking outside the window', () => {
      expect(
        isModifiable(
          bookingAt('2026-08-03T00:00:00.000Z'),
          professionalWithPolicy(24),
        ),
      ).toBe(true);
    });

    it('is false when the booking is not confirmed', () => {
      expect(
        isModifiable(
          bookingAt('2026-08-03T00:00:00.000Z', 'CANCELLED'),
          professionalWithPolicy(24),
        ),
      ).toBe(false);
    });

    it('is false when the start time has passed', () => {
      expect(
        isModifiable(
          bookingAt('2026-07-31T12:00:00.000Z'),
          professionalWithPolicy(24),
        ),
      ).toBe(false);
    });

    it('is false inside the cancellation window', () => {
      expect(
        isModifiable(
          bookingAt('2026-08-01T10:00:00.000Z'),
          professionalWithPolicy(24),
        ),
      ).toBe(false);
    });
  });
});
