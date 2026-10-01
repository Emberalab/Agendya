interface LoadErrorProps {
  /** What failed to load, e.g. "los tickets". */
  what: string;
  onRetry?: () => void;
  className?: string;
}

// One error state for every Backoffice query. Before this, most pages only
// handled `isLoading` and `data`, so a failed request (expired session, API
// down) rendered an empty card with no explanation and no way to retry.
export function LoadError({
  what,
  onRetry,
  className = 'p-4',
}: LoadErrorProps) {
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${className}`}
    >
      <span className="text-danger">Error al cargar {what}.</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-control font-semibold text-text-brand hover:underline"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
