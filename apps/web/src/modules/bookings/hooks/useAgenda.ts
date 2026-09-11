import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listAgenda } from '../api';

export function useAgenda(from: string, to: string) {
  return useQuery({
    queryKey: ['bookings', 'agenda', from, to],
    queryFn: () => listAgenda(from, to),
    // `from`/`to` change often and not just from the visible filter inputs —
    // e.g. the notification deep-link effect in AgendaPage widens them to
    // fetch a target day. Each change is a *new* query key, and without this,
    // every one of them briefly resets `data` to `undefined` (`isLoading`
    // flips back to `true`) while it refetches — the whole list/calendar
    // card unmounts to a "Cargando agenda…" placeholder and pops back a
    // moment later, which reads as the page reloading/glitching even though
    // nothing is actually wrong. Keeping the previous range's data on screen
    // until the new range resolves makes that transition invisible.
    placeholderData: keepPreviousData,
  });
}
