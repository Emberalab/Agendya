import type { Notification } from '@agendya/types';

export const NOTIFICATION_AGENDA_ROUTE = '/dashboard/agenda';

/**
 * Query params the agenda reads on load to open one booking's detail drawer:
 * `booking` is the id to open, `date` is that booking's day so the agenda can
 * widen its date range to include it. The agenda strips both once consumed.
 */
export const AGENDA_FOCUS_BOOKING_PARAM = 'booking';
export const AGENDA_FOCUS_DATE_PARAM = 'date';

/**
 * Where activating a notification navigates. Appointment notifications deep-link
 * to the agenda with the booking id and day, so the detail drawer opens for that
 * exact reservation — the same whether the list or the calendar view is active,
 * since both render the same drawer. Branch here when cancellations, reminders,
 * etc. get their own destinations.
 */
export function routeForNotification(notification: Notification): string {
  const bookingId = notification.data?.bookingId;
  if (!bookingId) return NOTIFICATION_AGENDA_ROUTE;

  const params = new URLSearchParams({
    [AGENDA_FOCUS_BOOKING_PARAM]: bookingId,
  });
  const day = notification.data.startAt?.slice(0, 10);
  if (day) params.set(AGENDA_FOCUS_DATE_PARAM, day);
  return `${NOTIFICATION_AGENDA_ROUTE}?${params.toString()}`;
}
