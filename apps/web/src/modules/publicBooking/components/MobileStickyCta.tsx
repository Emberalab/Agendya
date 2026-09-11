import { useEffect, useState } from 'react';
import { useInViewport } from '../../../shared/hooks/useInViewport';
import { prefersReducedMotion } from '../../../shared/a11y/prefersReducedMotion';

interface MobileStickyCtaProps {
  /** Same label the in-flow CTA shows ("Continuar →", "Confirmar reserva", "Reservando…"). */
  label: string;
  /** Same disabled state as the in-flow CTA — this must never bypass it. */
  disabled: boolean;
  /** The in-flow CTA's own handler. Single source of truth: no logic lives here. */
  onClick: () => void;
  /**
   * Ref to the real, in-flow "Continuar" button. While it is on screen the
   * sticky bar slides away, so the two are never visible together.
   */
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

function isTextEntry(node: EventTarget | null): boolean {
  return (
    node instanceof HTMLElement &&
    node.matches(
      'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]',
    )
  );
}

/**
 * Mobile-only (`< lg`) floating primary action for the booking wizard.
 *
 * The wizard's primary CTA lives at the bottom of the "Tu reserva" summary,
 * which on a phone sits below a tall stepper + business card + step content — so
 * a user who has finished the current step still has to scroll to act. This bar
 * keeps that same action within thumb reach while scrolling, and:
 *
 *  - **no duplicate CTA**: it hides (slide down) the moment the real button
 *    enters the viewport, via `IntersectionObserver` — not a scroll listener;
 *  - **no duplicate a11y control**: the bar is `aria-hidden` and its button is
 *    `tabIndex={-1}`, so screen readers and keyboard users only ever see the one
 *    real button (which is also next in DOM order). This is a pointer affordance;
 *  - **no duplicate logic**: `label` / `disabled` / `onClick` are the wizard's
 *    own — validation and navigation are unchanged;
 *  - **keyboard-aware**: hides while a field in the flow is focused (the
 *    on-screen keyboard is up and the real CTA sits right after the form);
 *  - **safe-area-aware**: `env(safe-area-inset-bottom)` keeps it clear of the
 *    iOS home indicator / PWA bottom inset.
 *
 * Desktop is untouched — the summary CTA is always visible in the sticky right
 * rail there, and this whole element is `display: none` at `lg`.
 */
export function MobileStickyCta({
  label,
  disabled,
  onClick,
  anchorRef,
}: MobileStickyCtaProps) {
  // `-96px` bottom margin ≈ this bar's height: the anchor counts as "in view"
  // only once it clears the space this bar occupies, so there's no flicker at
  // the exact edge and the two never overlap. Start assumed-visible so the bar
  // doesn't flash in on mount before the observer reports.
  const anchorInView = useInViewport(anchorRef, {
    rootMargin: '0px 0px -96px 0px',
    fallback: true,
  });

  const [fieldFocused, setFieldFocused] = useState(false);
  useEffect(() => {
    // Read the *settled* focus target — on `focusout` the active element is
    // briefly <body> before the next control receives focus.
    const sync = () =>
      setTimeout(() => setFieldFocused(isTextEntry(document.activeElement)), 0);
    document.addEventListener('focusin', sync);
    document.addEventListener('focusout', sync);

    // Scrolling a field's own text (or its content overflowing) never blurs
    // it — on a real device or here, `document.activeElement` stays the same
    // input for as long as it holds focus, keyboard or no keyboard. That
    // used to mean: type into the *last* field on a step, then scroll to
    // reach the real "Continuar" below the fold, and this bar — the one
    // thing meant to save that scroll — stayed hidden the entire time,
    // because nothing had blurred the field yet. Scrolling is itself proof
    // the customer is looking for something below, so show it regardless of
    // focus the moment they do; a fresh tap into a field re-hides it via
    // `focusin` above as usual.
    const onScroll = () => setFieldFocused(false);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      document.removeEventListener('focusin', sync);
      document.removeEventListener('focusout', sync);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const shown = !anchorInView && !fieldFocused;

  return (
    <div
      aria-hidden="true"
      data-testid="mobile-sticky-cta"
      data-state={shown ? 'shown' : 'hidden'}
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        boxShadow: shown ? '0 -10px 28px -14px rgba(15, 23, 42, 0.3)' : 'none',
        padding: '10px 16px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        transform: shown ? 'translateY(0)' : 'translateY(115%)',
        transition: prefersReducedMotion() ? 'none' : 'transform 0.22s ease',
        pointerEvents: shown ? 'auto' : 'none',
        willChange: 'transform',
      }}
    >
      <div className="mx-auto w-full max-w-6xl">
        <button
          type="button"
          tabIndex={-1}
          onClick={onClick}
          disabled={disabled}
          className="w-full rounded-xl px-6 py-3.5 font-semibold"
          style={{
            backgroundColor: disabled
              ? 'var(--color-surface-soft)'
              : 'var(--color-brand-primary)',
            color: disabled ? 'var(--color-text-muted)' : '#fff',
            border: disabled ? '1px solid var(--color-border)' : 'none',
            fontSize: '15px',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {label}
        </button>
      </div>
    </div>
  );
}
