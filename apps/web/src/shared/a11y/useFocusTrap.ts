import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Makes a dialog / drawer / popover keyboard-accessible per the WAI-ARIA
 * Authoring Practices: moves focus into it when it opens, keeps Tab/Shift+Tab
 * cycling inside it, closes it on Escape, and restores focus to whatever
 * triggered it once it closes.
 *
 * Attach the returned ref to the panel's outer element and give that element
 * `tabIndex={-1}` (it's the fallback focus target when the panel has no
 * focusable descendant yet). Pass `isOpen` so the same hook works both for
 * components that unmount when closed (most dialogs here) and ones that stay
 * mounted and toggle visibility (e.g. `AppointmentDrawer`, which returns
 * `null` internally based on a prop).
 *
 * Pass `existingRef` when the component already keeps its own ref on the
 * panel (e.g. `ContextMenu`/`ServiceRowMenu` use theirs for outside-click
 * detection and position calculation) so there's a single ref/DOM node
 * instead of two independent ones.
 */
export function useFocusTrap<T extends HTMLElement>(
  isOpen: boolean,
  onClose?: () => void,
  existingRef?: RefObject<T | null>,
) {
  const ownRef = useRef<T>(null);
  const containerRef = existingRef ?? ownRef;

  // Most callers pass an inline `() => setX(null)` as `onClose`, a new
  // function identity on every render. Reading it through a ref (updated on
  // every render, but not an effect dependency) keeps the effect below from
  // tearing down and re-running — and re-stealing focus — on every re-render
  // of the parent; it only runs on an actual open/close transition.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const triggerElement = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    // Defer one tick so the panel's own content (autoFocus fields, etc.) has
    // mounted before we decide what to focus.
    const focusId = window.setTimeout(() => {
      const focusable = container?.querySelectorAll<HTMLElement>(
        FOCUSABLE_SELECTOR,
      );
      (focusable && focusable[0] ? focusable[0] : container)?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onCloseRef.current) {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.clearTimeout(focusId);
      document.removeEventListener('keydown', handleKeyDown, true);
      // Give focus back to whatever opened this panel, unless it's gone.
      if (triggerElement && document.contains(triggerElement)) {
        triggerElement.focus();
      }
    };
    // `containerRef` is a ref object (stable identity) and `onClose` is read
    // through `onCloseRef`, so `isOpen` is the only real trigger here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return containerRef;
}
