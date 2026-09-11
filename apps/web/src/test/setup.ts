import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// Several screens code-split their heavy children via React.lazy (e.g. the
// agenda's AppointmentDrawer). Resolving those dynamic imports on first use can
// blow past the 1000ms default when the full suite runs specs in parallel and
// starves worker CPU, making findBy* assertions after a click flaky. Give async
// queries more headroom — this only extends how long a *failing* wait keeps
// polling; a query that will succeed still resolves as soon as the node appears.
configure({ asyncUtilTimeout: 5000 });

// jsdom doesn't implement scrollIntoView; components call it after selecting a slot.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom has no IntersectionObserver; the notification centre uses one for
// infinite scroll (it also renders an explicit "Ver más" button, which the
// tests drive). A no-op stub keeps the effect from throwing.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class NoopIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  globalThis.IntersectionObserver =
    NoopIntersectionObserver as unknown as typeof IntersectionObserver;
}
