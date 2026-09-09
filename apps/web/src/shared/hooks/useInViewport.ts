import { useEffect, useState } from 'react';

interface Options {
  /** Passed straight to `IntersectionObserver` — grow/shrink the effective viewport. */
  rootMargin?: string;
  /** Visibility ratio(s) that flip the result. */
  threshold?: number | number[];
  /** Value returned until an observer has reported (SSR, jsdom, `IntersectionObserver` missing). */
  fallback?: boolean;
}

/**
 * Whether `ref`'s element is currently intersecting the viewport, tracked with a
 * single `IntersectionObserver` — no scroll listener, no polling. The observer
 * is (re)created when the ref target or the options change and disconnected on
 * cleanup.
 *
 * Used by the mobile sticky booking CTA to know when the real in-flow
 * "Continuar" button is on screen, so the two are never shown at once.
 */
export function useInViewport<T extends Element>(
  ref: React.RefObject<T | null>,
  { rootMargin = '0px', threshold = 0, fallback = false }: Options = {},
): boolean {
  const [inViewport, setInViewport] = useState(fallback);
  const thresholdKey = Array.isArray(threshold)
    ? threshold.join(',')
    : String(threshold);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setInViewport(entry.isIntersecting);
      },
      { rootMargin, threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
    // `thresholdKey` stands in for the array identity of `threshold`.
  }, [ref, rootMargin, thresholdKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return inViewport;
}
