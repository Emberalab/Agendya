import type { ReactNode, MouseEvent } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}

// Border-first, shadow-only-on-hover — matches how apps/web builds its
// containers (surface + 1px border, `--shadow-menu` reserved for real
// overlays/menus, not resting cards).
export function Card({ children, className = '', padding = 'md', hover = false, onClick }: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverClass = hover ? 'hover:shadow-menu transition-shadow' : '';

  return (
    <div
      className={`rounded-xl border border-border bg-surface ${paddingClasses[padding]} ${hoverClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-xl font-semibold text-text-primary ${className}`}>{children}</h2>;
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`mt-1 text-sm text-text-muted ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
