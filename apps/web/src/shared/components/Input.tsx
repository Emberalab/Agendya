import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const hasError = !!error;
    // Without an explicit `id` the <label htmlFor> pointed at nothing (e.g.
    // the "Nueva fecha" field on the booking-management page had no
    // accessible name). Fall back to a generated one.
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const messageId = `${inputId}-message`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {label}
            {props.required && (
              <span className="ml-1 text-[var(--color-danger)]">*</span>
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={hasError || undefined}
          aria-describedby={error || helperText ? messageId : undefined}
          className={`
            min-h-11 w-full rounded-[var(--radius-control)] bg-[var(--color-surface)] px-3 py-2 text-[15px] text-[var(--color-text-primary)] transition-shadow
            placeholder:text-[var(--color-text-muted)]
            focus:outline-none
            disabled:cursor-not-allowed disabled:bg-[var(--color-surface-soft)] disabled:text-[var(--color-text-muted)]
            ${
              hasError
                ? 'shadow-[inset_0_0_0_2px_var(--color-danger)]'
                : 'shadow-[inset_0_0_0_1px_var(--color-border-strong)] focus:shadow-[inset_0_0_0_2px_var(--color-brand-primary)]'
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p
            id={messageId}
            role="alert"
            className="mt-1.5 text-sm text-[var(--color-danger)]"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={messageId}
            className="mt-1.5 text-sm text-[var(--color-text-muted)]"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
