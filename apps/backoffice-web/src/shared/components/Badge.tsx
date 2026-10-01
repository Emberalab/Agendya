import type { ReactNode } from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'secondary';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  /** A small leading dot, so status is never conveyed by color alone (the
   * text label already isn't, but this adds a second non-text cue too). */
  dot?: boolean;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  // Neutral "informational" tint — reuses the brand tint from apps/web
  // (nav active state, chips) rather than inventing a new hue.
  default: 'bg-brand-surface text-text-brand border border-brand-border',
  success: 'bg-success-surface text-success border border-success-border',
  warning: 'bg-warning-surface text-warning border border-warning-border',
  danger: 'bg-danger-surface text-danger border border-danger-border',
  secondary: 'bg-surface-soft text-text-muted border border-border',
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-text-brand',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  secondary: 'bg-text-muted',
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ children, variant = 'default', size = 'md', dot = true }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}`}
    >
      {dot && (
        <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${DOT_CLASSES[variant]}`} />
      )}
      {children}
    </span>
  );
}
