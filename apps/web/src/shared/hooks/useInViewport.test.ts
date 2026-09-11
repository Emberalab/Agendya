import { act, renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInViewport } from './useInViewport';

type IOCallback = (entries: Pick<IntersectionObserverEntry, 'isIntersecting'>[]) => void;

let lastCallback: IOCallback | undefined;
const observe = vi.fn();
const disconnect = vi.fn();

beforeEach(() => {
  lastCallback = undefined;
  observe.mockClear();
  disconnect.mockClear();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      root = null;
      rootMargin = '';
      thresholds = [];
      constructor(cb: IOCallback) {
        lastCallback = cb;
      }
      observe = observe;
      unobserve = vi.fn();
      disconnect = disconnect;
      takeRecords = () => [];
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function useHarness(fallback?: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  // Give the ref a real element so the observer attaches.
  if (!ref.current) ref.current = document.createElement('div');
  return useInViewport(ref, fallback === undefined ? undefined : { fallback });
}

describe('useInViewport', () => {
  it('returns the fallback until the observer reports', () => {
    const { result } = renderHook(() => useHarness(true));
    expect(result.current).toBe(true);
    expect(observe).toHaveBeenCalledTimes(1);
  });

  it('reflects the latest intersection entry', () => {
    const { result } = renderHook(() => useHarness(false));
    expect(result.current).toBe(false);

    act(() => lastCallback?.([{ isIntersecting: true }]));
    expect(result.current).toBe(true);

    act(() => lastCallback?.([{ isIntersecting: false }]));
    expect(result.current).toBe(false);
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = renderHook(() => useHarness());
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
