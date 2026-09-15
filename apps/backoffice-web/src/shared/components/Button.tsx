import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

// Same brand fill, radius and focus ring as apps/web's `.moon-button` (see
// main.scss) — this app doesn't pull in Moon Design System itself (see
// CLAUDE.md), but a plain button styled with the same tokens still reads as
// the same product.
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-control transition-colors focus-visible:outline-none focus-visible:shadow-focus-brand';

  const variantClasses = {
    primary: 'bg-brand-primary text-on-brand hover:bg-brand-primary-hover',
    secondary: 'bg-brand-secondary text-on-brand hover:opacity-90',
    outline:
      'bg-transparent text-text-primary shadow-[inset_0_0_0_1px_var(--color-border)] hover:bg-surface-soft hover:shadow-[inset_0_0_0_1px_var(--color-brand-primary)]',
    danger: 'bg-danger-fill text-on-brand hover:opacity-90',
    ghost: 'bg-transparent text-text-secondary hover:bg-surface-soft',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? 'cursor-not-allowed opacity-55' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${disabledClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
