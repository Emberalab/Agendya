import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

// New — same treatment as Input/Select; used for ticket replies and notes.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className = '', ...props }, ref) => {
    const textarea = (
      <textarea
        ref={ref}
        className={`w-full rounded-control bg-surface px-3 py-2 text-sm text-text-primary shadow-[inset_0_0_0_1px_var(--color-border)] transition-shadow placeholder:text-text-muted focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--color-brand-primary)] disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-text-muted ${className}`}
        {...props}
      />
    );

    if (!label) return textarea;

    return (
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-text-secondary">{label}</span>
        {textarea}
      </label>
    );
  },
);

Textarea.displayName = 'Textarea';
