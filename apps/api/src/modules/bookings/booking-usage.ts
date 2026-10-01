import type { Prisma } from '@prisma/client';

type BookingCounter = { booking: Pick<Prisma.BookingDelegate, 'count'> };

/**
 * Non-cancelled bookings created since the first day of the current UTC month.
 * The single definition behind the monthly plan limit, the usage bar, and the
 * usage-limit emails — they must never disagree.
 */
export function countBookingsThisMonth(
  client: BookingCounter,
  professionalId: string,
  now: Date = new Date(),
): Promise<number> {
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  return client.booking.count({
    where: {
      professionalId,
      status: { not: 'CANCELLED' },
      createdAt: { gte: monthStart },
    },
  });
}
