// Same stroke weight/viewBox convention as apps/web's NavIcon
// (modules/dashboard/NavIcon.tsx) — 18px, 1.5 stroke, currentColor — so the
// two sidebars read as the same icon family, not two different libraries.
export type BackofficeNavIconId =
  | 'panel'
  | 'tickets'
  | 'profesionales'
  | 'auditoria'
  | 'usuarios';

export function BackofficeNavIcon({ id }: { id: BackofficeNavIconId }) {
  if (id === 'panel')
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="6" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10" y="2" width="6" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10" y="8" width="6" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  if (id === 'tickets')
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M6.8 6.9a2.2 2.2 0 1 1 3.3 1.9c-.7.4-1.1.9-1.1 1.7v.2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M9 12.7h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  if (id === 'profesionales')
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 16c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  if (id === 'auditoria')
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="3.5" y="2.5" width="11" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6.5 2.5h5v2h-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M6 8.5h6M6 11.5h6M6 14.5h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  // usuarios internos — two overlapping heads, distinct from the single
  // "profesionales" icon above.
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="6.5" cy="6" r="2.75" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="7" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 16c0-2.9 2.2-5 5-5s5 2.1 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.5 11.3c1.9.3 3.3 1.9 3.3 4.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
