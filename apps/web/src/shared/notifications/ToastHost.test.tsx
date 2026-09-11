import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastHost } from './ToastHost';
import { useToastStore, type ToastInput } from './toastStore';

function pushToast(input: ToastInput): string {
  let id = '';
  act(() => {
    id = useToastStore.getState().push(input);
  });
  return id;
}

afterEach(() => {
  act(() => useToastStore.getState().clear());
  vi.useRealTimers();
});

describe('ToastHost', () => {
  it('renders nothing when the queue is empty', () => {
    const { container } = render(<ToastHost />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a pushed toast with its title and description', () => {
    render(<ToastHost />);
    pushToast({
      title: 'Nueva cita',
      description: 'Ana · Corte · Hoy a las 15:30',
    });

    expect(screen.getByText('Nueva cita')).toBeInTheDocument();
    expect(
      screen.getByText('Ana · Corte · Hoy a las 15:30'),
    ).toBeInTheDocument();
  });

  it('invokes onClick and dismisses when the body is clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<ToastHost />);
    pushToast({ title: 'Nueva cita', onClick });

    await user.click(screen.getByText('Nueva cita'));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Nueva cita')).not.toBeInTheDocument();
  });

  it('auto-dismisses after its duration', () => {
    vi.useFakeTimers();
    render(<ToastHost />);
    pushToast({ title: 'Nueva cita', durationMs: 5000 });

    expect(screen.getByText('Nueva cita')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5001);
    });
    expect(screen.queryByText('Nueva cita')).not.toBeInTheDocument();
  });

  it('can be dismissed with the close button', async () => {
    const user = userEvent.setup();
    render(<ToastHost />);
    pushToast({ title: 'Nueva cita' });

    await user.click(screen.getByLabelText('Descartar notificación'));

    expect(screen.queryByText('Nueva cita')).not.toBeInTheDocument();
  });
});
