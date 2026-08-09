import type { AgendaBooking } from '@agendya/types';
import { STATUS_CFG } from './statusBadge';

interface CalendarGridViewProps {
  bookings: AgendaBooking[];
  from: string;
  to: string;
  onBookingClick: (booking: AgendaBooking) => void;
}

export function CalendarGridView({
  bookings,
  from,
  to,
  onBookingClick,
}: CalendarGridViewProps) {
  // Generate days in range
  const startDate = new Date(from);
  const endDate = new Date(to);
  const days: Date[] = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  // Group bookings by date
  const bookingsByDate = new Map<string, AgendaBooking[]>();
  bookings.forEach((booking) => {
    const date = new Date(booking.startAt).toISOString().slice(0, 10);
    if (!bookingsByDate.has(date)) {
      bookingsByDate.set(date, []);
    }
    bookingsByDate.get(date)!.push(booking);
  });

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {days.map((day) => {
        const dateStr = day.toISOString().slice(0, 10);
        const dayBookings = bookingsByDate.get(dateStr) || [];
        const isToday = dateStr === new Date().toISOString().slice(0, 10);

        return (
          <div
            key={dateStr}
            className="rounded-2xl p-4"
            style={{
              backgroundColor: isToday ? '#EEF2FF' : 'var(--color-surface)',
              border: `1px solid ${isToday ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {day.toLocaleDateString(undefined, { weekday: 'short' })}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '18px',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {day.getDate()}
                </p>
              </div>
              <span
                className="inline-flex items-center justify-center rounded-full"
                style={{
                  minWidth: '22px',
                  height: '22px',
                  padding: '0 6px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: dayBookings.length > 0 ? 'var(--color-brand-primary)' : 'var(--color-surface-soft)',
                  color: dayBookings.length > 0 ? '#fff' : 'var(--color-text-muted)',
                }}
              >
                {dayBookings.length}
              </span>
            </div>

            {dayBookings.length === 0 ? (
              <p
                className="text-center"
                style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-text-muted)' }}
              >
                Sin citas
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {dayBookings.map((booking) => {
                  const cfg = STATUS_CFG[booking.status];
                  return (
                    <button
                      key={booking.id}
                      onClick={() => onBookingClick(booking)}
                      className="w-full rounded-lg p-2 text-left"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        cursor: 'pointer',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                          {new Date(booking.startAt).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <span className="rounded-full shrink-0" style={{ width: '7px', height: '7px', backgroundColor: cfg.color }} />
                      </div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {booking.customerName}
                      </p>
                      <p className="truncate" style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {booking.serviceName}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
