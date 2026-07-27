import type { AgendaBooking } from '@agendya/types';
import { Badge } from '../../shared/components/Badge';
import { Card, CardContent } from '../../shared/components/Card';

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
          <Card
            key={dateStr}
            className={`${isToday ? 'border-blue-400 bg-blue-50' : ''}`}
          >
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {day.toLocaleDateString(undefined, { weekday: 'short' })}
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {day.getDate()}
                  </p>
                </div>
                <Badge variant="default" size="sm">
                  {dayBookings.length}
                </Badge>
              </div>

              {dayBookings.length === 0 ? (
                <p className="text-center text-sm text-gray-400">Sin citas</p>
              ) : (
                <div className="space-y-2">
                  {dayBookings.map((booking) => (
                    <button
                      key={booking.id}
                      onClick={() => onBookingClick(booking)}
                      className="w-full rounded-lg border border-gray-200 bg-white p-2 text-left transition-colors hover:bg-gray-50"
                    >
                      <p className="text-xs font-medium text-gray-900">
                        {new Date(booking.startAt).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-gray-600">{booking.customerName}</p>
                      <p className="truncate text-xs text-gray-500">
                        {booking.serviceName}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
