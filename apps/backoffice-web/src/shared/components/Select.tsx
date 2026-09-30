import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

// New — the four backoffice pages each hand-rolled the same raw `<select>`
// with the same border/radius/dark classes. Pulled into one component,
// styled like Input so filters and forms read consistently.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className = '', children, ...props }, ref) => {
    const select = (
      <select
        ref={ref}
        className={`w-full rounded-control bg-surface px-3 py-2 text-sm text-text-primary shadow-[inset_0_0_0_1px_var(--color-border)] transition-shadow focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--color-brand-primary)] disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-text-muted ${className}`}
        {...props}
      >
        {children}
      </select>
    );

    if (!label) return select;

    return (
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-text-secondary">{label}</span>
        {select}
      </label>
    );
  },
);

Select.displayName = 'Select';
