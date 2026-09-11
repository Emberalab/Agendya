import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileStickyCta } from './MobileStickyCta';

type IOCallback = (
  entries: Pick<IntersectionObserverEntry, 'isIntersecting'>[],
) => void;

let lastCallback: IOCallback | undefined;

beforeEach(() => {
  lastCallback = undefined;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      root = null;
      rootMargin = '';
      thresholds = [];
      constructor(cb: IOCallback) {
        lastCallback = cb;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = () => [];
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Harness({
  disabled = false,
  onClick = () => {},
}: {
  disabled?: boolean;
  onClick?: () => void;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <input aria-label="nombre" />
      <button ref={anchorRef} type="button">
        Continuar →
      </button>
      <MobileStickyCta
        label="Continuar →"
        disabled={disabled}
        onClick={onClick}
        anchorRef={anchorRef}
      />
    </div>
  );
}

const bar = () => screen.getByTestId('mobile-sticky-cta');
const stickyButton = () =>
  screen.getByTestId('mobile-sticky-cta').querySelector('button')!;

/** Push an intersection state through the mocked observer. */
function setAnchorInView(inView: boolean) {
  act(() => lastCallback?.([{ isIntersecting: inView }]));
}

describe('MobileStickyCta', () => {
  it('is a pointer-only affordance: aria-hidden with a non-tabbable button', () => {
    render(<Harness />);
    expect(bar()).toHaveAttribute('aria-hidden', 'true');
    expect(stickyButton()).toHaveAttribute('tabindex', '-1');
  });

  it('shows only while the real CTA is off screen', () => {
    render(<Harness />);
    // Starts assumed in-view (no flash on mount).
    expect(bar()).toHaveAttribute('data-state', 'hidden');

    setAnchorInView(false);
    expect(bar()).toHaveAttribute('data-state', 'shown');

    setAnchorInView(true);
    expect(bar()).toHaveAttribute('data-state', 'hidden');
  });

  it('mirrors the disabled state and reuses the passed handler', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Harness disabled onClick={onClick} />);
    setAnchorInView(false);

    expect(stickyButton()).toBeDisabled();
    await user.click(stickyButton());
    expect(onClick).not.toHaveBeenCalled();

    rerender(<Harness disabled={false} onClick={onClick} />);
    setAnchorInView(false);
    expect(stickyButton()).toBeEnabled();
    await user.click(stickyButton());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('hides while a text field in the flow is focused (keyboard open)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    setAnchorInView(false);
    expect(bar()).toHaveAttribute('data-state', 'shown');

    await user.click(screen.getByLabelText('nombre'));
    await waitFor(() =>
      expect(bar()).toHaveAttribute('data-state', 'hidden'),
    );

    await user.tab();
    await waitFor(() => expect(bar()).toHaveAttribute('data-state', 'shown'));
  });

  // Regression: scrolling a field's *content* (or just scrolling the page to
  // look for the CTA) never blurs it — `document.activeElement` stays the
  // focused field the whole time, keyboard or no keyboard. A customer who
  // finished typing into the *last* field on a step and then scrolled to
  // reach the real "Continuar" (instead of first tapping away to blur it)
  // used to find this bar — the one thing meant to save that scroll — still
  // hidden for as long as they kept scrolling.
  it('shows again on scroll even while a field is still focused', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    setAnchorInView(false);

    await user.click(screen.getByLabelText('nombre'));
    await waitFor(() =>
      expect(bar()).toHaveAttribute('data-state', 'hidden'),
    );
    expect(document.activeElement).toBe(screen.getByLabelText('nombre'));

    fireEvent.scroll(window);

    await waitFor(() => expect(bar()).toHaveAttribute('data-state', 'shown'));
    // The scroll shows the bar without touching focus itself.
    expect(document.activeElement).toBe(screen.getByLabelText('nombre'));
  });
  // Safe-area padding (`max(10px, env(safe-area-inset-bottom))`) can't be
  // asserted here — jsdom's CSSOM drops `env()`/`max()` values. It is checked
  // in the Playwright spec, which runs in real Chromium.
});
