import type { ReactNode } from 'react';

export function FieldError({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 text-sm text-red-600 dark:text-red-400"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {children}
    </p>
  );
}
