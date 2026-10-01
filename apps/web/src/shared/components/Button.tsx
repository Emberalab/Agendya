import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

// Agendya tokens, same variant set and look as apps/backoffice-web's Button
// and this app's `.moon-button` (brand fill, --radius-control, brand focus
// ring). This used to be a generic Tailwind template (blue-600 / gray-*),
// which made the customer-facing booking-management page the one screen that
// didn't look like Agendya.
const VARIANT_CLASSES = {
  primary:
    'bg-[var(--color-brand-primary)] text-[var(--color-text-on-brand)] hover:bg-[var(--color-brand-primary-hover)]',
  secondary:
    'bg-[var(--color-text-primary)] text-[var(--color-surface)] hover:opacity-90',
  outline:
    'bg-transparent text-[var(--color-text-primary)] shadow-[inset_0_0_0_1px_var(--color-border-strong)] hover:bg-[var(--color-surface-soft)] hover:shadow-[inset_0_0_0_1px_var(--color-brand-primary)]',
  danger:
    'bg-[var(--color-danger-fill)] text-[var(--color-text-on-brand)] hover:opacity-90',
  ghost:
    'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-soft)]',
};

const SIZE_CLASSES = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-6 text-base',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold transition-colors focus-visible:shadow-[var(--shadow-focus-brand)] ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
