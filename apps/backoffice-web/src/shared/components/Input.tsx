import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

// Same look as apps/web's `.moon-input.moon-input-outline` (inset 1px
// border, radius-control, 2px brand ring on focus) — see main.scss.
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={props.id} className="mb-1.5 block text-sm font-medium text-text-secondary">
            {label}
            {props.required && <span className="ml-1 text-danger">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-control bg-surface px-3 py-2 text-text-primary transition-shadow
            placeholder:text-text-muted
            focus:outline-none
            disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-text-muted
            ${
              hasError
                ? 'shadow-[inset_0_0_0_1px_var(--color-danger)] focus:shadow-[inset_0_0_0_2px_var(--color-danger)]'
                : 'shadow-[inset_0_0_0_1px_var(--color-border)] focus:shadow-[inset_0_0_0_2px_var(--color-brand-primary)]'
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p role="alert" className="mt-1.5 text-sm text-danger">
            {error}
          </p>
        )}
        {helperText && !error && <p className="mt-1.5 text-sm text-text-muted">{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
