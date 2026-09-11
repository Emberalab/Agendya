import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SetWorkingHoursInput, WorkingHour } from '@agendya/types';
import * as api from './api';
import { DaySchedulePage } from './DaySchedulePage';
import { SchedulePage } from './SchedulePage';
import { WORKING_HOURS_QUERY_KEY } from './hooks/useWorkingHours';

vi.mock('./api');

// Mirrors the screenshot: every day but Sunday already has a working block,
// Monday has two.
const INITIAL_HOURS: WorkingHour[] = [
  { id: 'wh-mon-1', dayOfWeek: 'MONDAY', startMinute: 480, endMinute: 780 }, // 08:00–13:00
  { id: 'wh-mon-2', dayOfWeek: 'MONDAY', startMinute: 840, endMinute: 1200 }, // 14:00–20:00
  { id: 'wh-tue-1', dayOfWeek: 'TUESDAY', startMinute: 540, endMinute: 1080 }, // 09:00–18:00
  { id: 'wh-wed-1', dayOfWeek: 'WEDNESDAY', startMinute: 540, endMinute: 1080 },
  { id: 'wh-thu-1', dayOfWeek: 'THURSDAY', startMinute: 540, endMinute: 1080 },
  { id: 'wh-fri-1', dayOfWeek: 'FRIDAY', startMinute: 540, endMinute: 1080 },
  { id: 'wh-sat-1', dayOfWeek: 'SATURDAY', startMinute: 540, endMinute: 1080 },
];

function renderDayPage(
  initialEntries: string[] = ['/dashboard/schedule/martes'],
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/dashboard/schedule" element={<SchedulePage />} />
          <Route
            path="/dashboard/schedule/:day"
            element={<DaySchedulePage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

/** Fills both native `type=time` inputs in the currently-open block drawer. */
async function fillBlock(
  user: ReturnType<typeof userEvent.setup>,
  start: string,
  end: string,
) {
  const dialog = await screen.findByRole('dialog', { name: /bloque/i });
  const startInput = within(dialog).getByLabelText('Hora de inicio');
  const endInput = within(dialog).getByLabelText('Hora de fin');
  await user.clear(startInput);
  await user.type(startInput, start);
  await user.clear(endInput);
  await user.type(endInput, end);
  return dialog;
}

/** The page-level "Aplicar a todos los días activos" checkbox (not inside the modal). */
const applyToAllCheckbox = () =>
  screen.getByRole('checkbox', { name: /Aplicar a todos los días activos/ });

const saveConfigButton = () =>
  screen.getByRole('button', { name: 'Guardar configuración' });

describe('DaySchedulePage', () => {
  beforeEach(() => {
    vi.mocked(api.getWorkingHours).mockResolvedValue(INITIAL_HOURS);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('adds a second block to the day and saves both alongside the existing one', async () => {
    vi.mocked(api.setWorkingHours).mockResolvedValue(INITIAL_HOURS);

    const user = userEvent.setup();
    renderDayPage();

    expect(
      await screen.findByRole('heading', { name: 'Configurar Martes' }),
    ).toBeInTheDocument();
    // Tuesday starts with its one existing block.
    expect(await screen.findByText('09:00 – 18:00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Agregar bloque/ }));
    await fillBlock(user, '19:00', '20:00');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    // Both blocks now show locally, before the outer save.
    await waitFor(() => {
      expect(screen.getByText('09:00 – 18:00')).toBeInTheDocument();
      expect(screen.getByText('19:00 – 20:00')).toBeInTheDocument();
    });

    await user.click(saveConfigButton());

    await waitFor(() => expect(api.setWorkingHours).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(api.setWorkingHours).mock
      .calls[0][0] as SetWorkingHoursInput;
    const tuesdayBlocks = payload.days.filter(
      (d) => d.dayOfWeek === 'TUESDAY',
    );
    expect(tuesdayBlocks).toHaveLength(2);
    expect(tuesdayBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ startMinute: 540, endMinute: 1080 }),
        expect.objectContaining({ startMinute: 1140, endMinute: 1200 }),
      ]),
    );
    // Monday's own two blocks are untouched — "aplicar a todos" was never
    // checked in this test.
    const mondayBlocks = payload.days.filter((d) => d.dayOfWeek === 'MONDAY');
    expect(mondayBlocks).toHaveLength(2);
  });

  it('copies every block to the other active days when "aplicar a todos los días activos" is checked', async () => {
    vi.mocked(api.setWorkingHours).mockResolvedValue(INITIAL_HOURS);

    const user = userEvent.setup();
    renderDayPage();
    await screen.findByRole('heading', { name: 'Configurar Martes' });
    await screen.findByText('09:00 – 18:00');

    await user.click(screen.getByRole('button', { name: /Agregar bloque/ }));
    await fillBlock(user, '19:00', '20:00');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await screen.findByText('19:00 – 20:00');

    // The toggle lives on the page itself, always visible — not hidden
    // inside the block modal.
    await user.click(applyToAllCheckbox());
    await user.click(saveConfigButton());

    await waitFor(() => expect(api.setWorkingHours).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(api.setWorkingHours).mock
      .calls[0][0] as SetWorkingHoursInput;

    // Every active day (all but Sunday, which was never configured) ends up
    // with *both* of Tuesday's blocks — the whole current day, not just the
    // last block that was saved.
    for (const day of ['WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']) {
      const blocks = payload.days.filter((d) => d.dayOfWeek === day);
      expect(blocks).toHaveLength(2);
      expect(blocks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ startMinute: 540, endMinute: 1080 }),
          expect.objectContaining({ startMinute: 1140, endMinute: 1200 }),
        ]),
      );
    }
    // Sunday was never active (no existing blocks) — copying never turns a
    // day on by itself.
    expect(payload.days.filter((d) => d.dayOfWeek === 'SUNDAY')).toHaveLength(
      0,
    );
    // Monday keeps its own, different two blocks — it's active, so it *does*
    // get overwritten by the copy (that's the documented "aplicar a todos"
    // contract) — assert it now matches Tuesday's, not its original
    // 08:00–13:00 / 14:00–20:00.
    const mondayBlocks = payload.days.filter((d) => d.dayOfWeek === 'MONDAY');
    expect(mondayBlocks).toHaveLength(2);
    expect(mondayBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ startMinute: 540, endMinute: 1080 }),
        expect.objectContaining({ startMinute: 1140, endMinute: 1200 }),
      ]),
    );
  });

  // Bug 1, root cause and fix: the checkbox used to live inside the
  // per-block modal, silently sticking at `true` for the rest of that one
  // session but resetting to `false` the moment the editor remounted (e.g.
  // after a real save + navigate-away, then coming back to add one more
  // block) — with no visible trace of that reset anywhere on screen. A block
  // added on that later visit quietly never reached the other days. Moving
  // the toggle to the page itself doesn't change *when* it resets, but it
  // does mean the professional can always see its current state before
  // saving instead of trusting an invisible flag.
  it('does not copy to other days on a later, separate visit unless the toggle is checked again', async () => {
    let saved: WorkingHour[] = INITIAL_HOURS;
    vi.mocked(api.setWorkingHours).mockImplementation(
      async (input: SetWorkingHoursInput) => {
        saved = input.days.map((d, i) => ({ id: `wh-${i}`, ...d }));
        return saved;
      },
    );
    vi.mocked(api.getWorkingHours).mockImplementation(async () => saved);

    const user = userEvent.setup();
    renderDayPage();
    await screen.findByRole('heading', { name: 'Configurar Martes' });
    await screen.findByText('09:00 – 18:00');

    // First visit: add a block, check "aplicar a todos", save the whole
    // configuration.
    await user.click(screen.getByRole('button', { name: /Agregar bloque/ }));
    await fillBlock(user, '19:00', '20:00');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await user.click(applyToAllCheckbox());
    await user.click(saveConfigButton());

    // Save navigates back to the weekly table.
    await screen.findByRole('heading', { name: 'Horario Semanal' });
    expect(saved.filter((h) => h.dayOfWeek === 'WEDNESDAY')).toHaveLength(2);

    // Second, separate visit to the same day: the toggle is visibly back to
    // unchecked (not a hidden, silently-still-on flag).
    const [configureTuesday] = await screen.findAllByRole('button', {
      name: 'Configurar Martes',
    });
    await user.click(configureTuesday);
    await screen.findByRole('heading', { name: 'Configurar Martes' });
    expect(applyToAllCheckbox()).not.toBeChecked();

    // Add one more block *without* re-checking it.
    await user.click(screen.getByRole('button', { name: /Agregar bloque/ }));
    await fillBlock(user, '20:30', '21:00');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await user.click(saveConfigButton());

    await waitFor(() => expect(api.setWorkingHours).toHaveBeenCalledTimes(2));
    const secondPayload = vi.mocked(api.setWorkingHours).mock
      .calls[1][0] as SetWorkingHoursInput;

    // Tuesday itself always gets its own newly-added third block.
    expect(
      secondPayload.days.filter((d) => d.dayOfWeek === 'TUESDAY'),
    ).toHaveLength(3);
    // Wednesday does not — the toggle was off, visibly, for this save.
    expect(
      secondPayload.days.filter((d) => d.dayOfWeek === 'WEDNESDAY'),
    ).toHaveLength(2);
  });

  // Same scenario, but this time the professional *does* notice the toggle
  // and re-checks it — confirms the fix isn't just "never copy again."
  it('does copy the new block to other days on a later visit when the toggle is checked again', async () => {
    let saved: WorkingHour[] = INITIAL_HOURS;
    vi.mocked(api.setWorkingHours).mockImplementation(
      async (input: SetWorkingHoursInput) => {
        saved = input.days.map((d, i) => ({ id: `wh-${i}`, ...d }));
        return saved;
      },
    );
    vi.mocked(api.getWorkingHours).mockImplementation(async () => saved);

    const user = userEvent.setup();
    renderDayPage();
    await screen.findByRole('heading', { name: 'Configurar Martes' });
    await screen.findByText('09:00 – 18:00');

    await user.click(screen.getByRole('button', { name: /Agregar bloque/ }));
    await fillBlock(user, '19:00', '20:00');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await user.click(applyToAllCheckbox());
    await user.click(saveConfigButton());
    await screen.findByRole('heading', { name: 'Horario Semanal' });

    const [configureTuesday] = await screen.findAllByRole('button', {
      name: 'Configurar Martes',
    });
    await user.click(configureTuesday);
    await screen.findByRole('heading', { name: 'Configurar Martes' });

    await user.click(screen.getByRole('button', { name: /Agregar bloque/ }));
    await fillBlock(user, '20:30', '21:00');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await user.click(applyToAllCheckbox());
    await user.click(saveConfigButton());

    await waitFor(() => expect(api.setWorkingHours).toHaveBeenCalledTimes(2));
    const secondPayload = vi.mocked(api.setWorkingHours).mock
      .calls[1][0] as SetWorkingHoursInput;

    expect(
      secondPayload.days.filter((d) => d.dayOfWeek === 'WEDNESDAY'),
    ).toHaveLength(3);
  });

  // Bug 2 investigation: a confirmed, concrete destructive edge case in the
  // *original* copy logic — emptying the day being edited (deleting its only
  // block) while "aplicar a todos" is checked replaced every other active
  // day's blocks with an empty array, wiping their schedules. The fix: never
  // copy an empty result.
  it('never wipes the other active days when the edited day is emptied with the toggle checked', async () => {
    vi.mocked(api.setWorkingHours).mockResolvedValue(INITIAL_HOURS);

    const user = userEvent.setup();
    renderDayPage();
    await screen.findByRole('heading', { name: 'Configurar Martes' });
    await screen.findByText('09:00 – 18:00');

    await user.click(
      screen.getByRole('button', { name: 'Eliminar bloque 09:00 – 18:00' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Eliminar' }),
    );
    await screen.findByText(
      'Este día no tiene bloques de trabajo. Agrega uno para recibir reservas.',
    );

    await user.click(applyToAllCheckbox());
    await user.click(saveConfigButton());

    await waitFor(() => expect(api.setWorkingHours).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(api.setWorkingHours).mock
      .calls[0][0] as SetWorkingHoursInput;

    // Tuesday is (correctly) empty now — that was the actual edit.
    expect(payload.days.filter((d) => d.dayOfWeek === 'TUESDAY')).toHaveLength(
      0,
    );
    // Every other previously-active day keeps its own schedule intact.
    for (const day of [
      'MONDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ]) {
      expect(
        payload.days.filter((d) => d.dayOfWeek === day).length,
      ).toBeGreaterThan(0);
    }
  });

  it('keeps blocks identified by stable ids independent of their sorted position', async () => {
    vi.mocked(api.setWorkingHours).mockResolvedValue(INITIAL_HOURS);

    const user = userEvent.setup();
    renderDayPage(['/dashboard/schedule/lunes']);
    await screen.findByRole('heading', { name: 'Configurar Lunes' });
    // Monday: 08:00–13:00 and 14:00–20:00.
    await screen.findByText('08:00 – 13:00');
    await screen.findByText('14:00 – 20:00');

    // Edit the *later* block to start *before* the earlier one — this
    // reorders the sorted list. If the block were tracked by array index
    // instead of id, this would silently corrupt the wrong entry.
    await user.click(
      screen.getByRole('button', { name: 'Editar bloque 14:00 – 20:00' }),
    );
    const dialog = await fillBlock(user, '05:00', '07:00');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      // The edited block moved to the front...
      expect(screen.getByText('05:00 – 07:00')).toBeInTheDocument();
      // ...and the untouched block is still exactly what it was.
      expect(screen.getByText('08:00 – 13:00')).toBeInTheDocument();
      expect(screen.queryByText('14:00 – 20:00')).not.toBeInTheDocument();
    });

    await user.click(saveConfigButton());
    await waitFor(() => expect(api.setWorkingHours).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(api.setWorkingHours).mock
      .calls[0][0] as SetWorkingHoursInput;
    const mondayBlocks = payload.days.filter((d) => d.dayOfWeek === 'MONDAY');
    expect(mondayBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ startMinute: 300, endMinute: 420 }),
        expect.objectContaining({ startMinute: 480, endMinute: 780 }),
      ]),
    );
  });

  // A background refetch that resolves with unchanged data must not discard
  // an unsaved local edit — react-query's default structural sharing already
  // protects against this (a same-content refetch keeps the same `data`
  // reference, so the effect that syncs local state from the server never
  // re-fires), but it's exactly the kind of thing that's easy to break by
  // accident, so it's worth asserting directly.
  it('does not lose a locally-added, unsaved block to a background refetch of the same data', async () => {
    const user = userEvent.setup();
    const { queryClient } = renderDayPage();
    await screen.findByRole('heading', { name: 'Configurar Martes' });
    await screen.findByText('09:00 – 18:00');

    await user.click(screen.getByRole('button', { name: /Agregar bloque/ }));
    await fillBlock(user, '19:00', '20:00');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await screen.findByText('19:00 – 20:00');

    await queryClient.refetchQueries({ queryKey: WORKING_HOURS_QUERY_KEY });

    expect(screen.getByText('09:00 – 18:00')).toBeInTheDocument();
    expect(screen.getByText('19:00 – 20:00')).toBeInTheDocument();
  });

  describe('unsaved-changes indicator', () => {
    it('disables "Guardar configuración" with no changes, enables it once a block is added, and shows the saved state after saving', async () => {
      vi.mocked(api.setWorkingHours).mockResolvedValue(INITIAL_HOURS);

      const user = userEvent.setup();
      renderDayPage();
      await screen.findByRole('heading', { name: 'Configurar Martes' });
      await screen.findByText('09:00 – 18:00');

      expect(saveConfigButton()).toBeDisabled();
      expect(
        screen.getByText(
          'Los cambios se aplican de inmediato a tu página de reservas.',
        ),
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Agregar bloque/ }));
      await fillBlock(user, '19:00', '20:00');
      await user.click(screen.getByRole('button', { name: 'Guardar' }));

      expect(saveConfigButton()).toBeEnabled();
      expect(
        screen.getByText('Tienes cambios sin guardar.'),
      ).toBeInTheDocument();

      await user.click(saveConfigButton());

      // The save navigates away; the "guardado" state briefly applies to
      // this same instance before that happens.
      await waitFor(() => expect(api.setWorkingHours).toHaveBeenCalled());
    });

    it('is dirty as soon as "aplicar a todos los días activos" is checked, even with no block changes', async () => {
      renderDayPage();
      const user = userEvent.setup();
      await screen.findByRole('heading', { name: 'Configurar Martes' });
      await screen.findByText('09:00 – 18:00');

      expect(saveConfigButton()).toBeDisabled();

      await user.click(applyToAllCheckbox());

      expect(saveConfigButton()).toBeEnabled();
      expect(
        screen.getByText('Tienes cambios sin guardar.'),
      ).toBeInTheDocument();
    });
  });
});
