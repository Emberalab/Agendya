import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Rendered inside the field, right-aligned (e.g. a show-password toggle). */
  endSlot?: ReactNode;
  /** `lg` = the roomier 44px field used on the sign-in screens. */
  fieldSize?: 'md' | 'lg';
}

// Same look as apps/web's `.moon-input.moon-input-outline` (inset 1px
// border, radius-control, 2px brand ring on focus) — see main.scss.
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      endSlot,
      fieldSize = 'md',
      className = '',
      id,
      ...props
    },
    ref,
  ) => {
    const hasError = !!error;
    // Callers rarely pass an `id`; without one the <label htmlFor> pointed at
    // nothing and the field had no accessible name. Fall back to a stable
    // generated id so the label, error and helper text are always wired up.
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const messageId = `${inputId}-message`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-text-secondary"
          >
            {label}
            {props.required && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={hasError || undefined}
            aria-describedby={error || helperText ? messageId : undefined}
            className={`
              w-full rounded-control bg-surface text-text-primary transition-shadow
              ${fieldSize === 'lg' ? 'min-h-11 py-2.5 text-[15px]' : 'py-2 text-sm'}
              ${endSlot ? 'pl-3 pr-11' : 'px-3'}
              placeholder:text-text-muted
              focus:outline-none
              disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-text-muted
              ${
                hasError
                  ? 'shadow-[inset_0_0_0_1px_var(--color-danger)] focus:shadow-[inset_0_0_0_2px_var(--color-danger)]'
                  : 'shadow-[inset_0_0_0_1px_var(--color-border-strong)] focus:shadow-[inset_0_0_0_2px_var(--color-brand-primary)]'
              }
              ${className}
            `}
            {...props}
          />
          {endSlot && (
            <div className="absolute inset-y-0 right-1 flex items-center">
              {endSlot}
            </div>
          )}
        </div>
        {error && (
          <p id={messageId} role="alert" className="mt-1.5 text-sm text-danger">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={messageId} className="mt-1.5 text-sm text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
