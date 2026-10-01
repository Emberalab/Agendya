import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { searchBackoffice } from '../dashboard/api';
import { Input } from '../../../shared/components/Input';
import { Card } from '../../../shared/components/Card';
import { LoadError } from '../../../shared/components/LoadError';

export function ProfessionalSearchPage() {
  // The query lives in the URL (`?q=`) rather than component state, so going
  // into a professional's 360 view and pressing back returns to the same
  // results instead of an empty search box.
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const setQ = (value: string) =>
    setSearchParams(value ? { q: value } : {}, { replace: true });
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['backoffice', 'search', q],
    queryFn: () => searchBackoffice(q),
    enabled: q.trim().length >= 2,
  });

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-bold text-text-primary">Profesionales</h1>
      <p className="mt-1 text-sm text-text-muted">
        Busca por nombre del negocio, correo o enlace público.
      </p>

      <div className="mt-4">
        <Input
          type="search"
          placeholder="Buscar profesional…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          aria-label="Buscar profesional"
          helperText={
            q.trim().length === 1 ? 'Escribe al menos 2 caracteres.' : undefined
          }
        />
      </div>

      {isFetching && (
        <p role="status" className="mt-4 text-sm text-text-muted">
          Buscando…
        </p>
      )}
      {isError && (
        <LoadError
          what="la búsqueda"
          onRetry={() => void refetch()}
          className="mt-4"
        />
      )}

      {data && q.trim().length >= 2 && (
        <Card className="mt-4" padding="none">
          {data.professionals.length === 0 ? (
            <p className="p-4 text-sm text-text-muted">Sin resultados.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.professionals.map((professional) => (
                <li key={professional.id}>
                  <Link
                    to={`/backoffice/professionals/${professional.id}`}
                    className="flex flex-col p-4 hover:bg-surface-soft"
                  >
                    <span className="text-sm font-medium text-text-primary">
                      {professional.businessName}
                    </span>
                    <span className="text-xs text-text-muted">
                      {professional.email} · /{professional.slug}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
