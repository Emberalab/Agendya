import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'secondary';
  size?: 'sm' | 'md';
}

// Token-based, same variant → color family mapping as apps/backoffice-web's
// Badge ("default" = brand/informational). Was raw blue/green/yellow-100.
const VARIANT_CLASSES = {
  default:
    'bg-[var(--color-brand-surface)] text-[var(--color-text-brand)] border-[var(--color-brand-border)]',
  success:
    'bg-[var(--color-success-surface)] text-[var(--color-success)] border-[var(--color-success-border)]',
  warning:
    'bg-[var(--color-warning-surface)] text-[var(--color-warning)] border-[var(--color-warning-border)]',
  danger:
    'bg-[var(--color-danger-surface)] text-[var(--color-danger)] border-[var(--color-danger-border)]',
  secondary:
    'bg-[var(--color-surface-soft)] text-[var(--color-text-muted)] border-[var(--color-border)]',
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}`}
    >
      {children}
    </span>
  );
}
