import type { ReactNode } from 'react';
import Logo from '../../../imports/LogoGroup';

/**
 * Shell for every signed-out Backoffice screen (sign-in, forgot / reset
 * password, Google callback). Same structure as apps/web's sign-in column:
 * wordmark top-left, a centred 384px form column, legal line at the bottom —
 * plus a "Backoffice" tag so staff always know which product they're in.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-surface px-6 py-8 sm:px-10">
      <header className="flex items-center gap-2">
        <div className="relative size-8 shrink-0">
          <Logo />
        </div>
        <span className="font-display text-2xl font-bold text-text-brand">
          agendya
        </span>
        <span className="rounded-full border border-border bg-surface-soft px-2 py-0.5 text-xs font-semibold text-text-muted">
          Backoffice
        </span>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-sm py-10">
        {children}
      </main>

      <footer className="text-center font-mono text-xs text-text-muted">
        © {new Date().getFullYear()} agendya · Herramienta interna del equipo de
        Agendya.
      </footer>
    </div>
  );
}

/** The rounded icon tile above each heading (as in apps/web's sign-in). */
export function AuthIcon({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="mb-6 flex size-12 items-center justify-center rounded-2xl border border-border bg-surface-soft text-text-muted"
    >
      {children}
    </div>
  );
}

export function AuthHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: ReactNode;
}) {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-text-primary">{title}</h1>
      <p className="mb-7 text-sm text-text-secondary">{subtitle}</p>
    </>
  );
}

export function AuthAlert({
  tone,
  children,
}: {
  tone: 'danger' | 'success';
  children: ReactNode;
}) {
  const toneClasses =
    tone === 'danger'
      ? 'border-danger-border bg-danger-surface text-danger'
      : 'border-success-border bg-success-surface text-success';
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`mb-4 rounded-control border p-3 text-sm ${toneClasses}`}
    >
      {children}
    </div>
  );
}
