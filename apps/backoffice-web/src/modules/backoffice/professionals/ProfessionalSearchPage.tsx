import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { searchBackoffice } from '../dashboard/api';
import { Input } from '../../../shared/components/Input';
import { Card } from '../../../shared/components/Card';

export function ProfessionalSearchPage() {
  const [q, setQ] = useState('');
  const { data, isFetching } = useQuery({
    queryKey: ['backoffice', 'search', q],
    queryFn: () => searchBackoffice(q),
    enabled: q.trim().length >= 2,
  });

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-bold text-text-primary">Profesionales</h1>
      <p className="mt-1 text-sm text-text-muted">Busca por nombre del negocio, correo o enlace público.</p>

      <div className="mt-4">
        <Input placeholder="Buscar profesional…" value={q} onChange={(event) => setQ(event.target.value)} aria-label="Buscar profesional" />
      </div>

      {isFetching && <p className="mt-4 text-sm text-text-muted">Buscando…</p>}

      {data && q.trim().length >= 2 && (
        <Card className="mt-4" padding="none">
          {data.professionals.length === 0 ? (
            <p className="p-4 text-sm text-text-muted">Sin resultados.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.professionals.map((professional) => (
                <li key={professional.id}>
                  <Link to={`/backoffice/professionals/${professional.id}`} className="flex flex-col p-4 hover:bg-surface-soft">
                    <span className="text-sm font-medium text-text-primary">{professional.businessName}</span>
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
