import { useEffect, useState, type CSSProperties } from 'react';
import {
  ACCESS_STATUS_LABELS,
  type AccessStatus,
  type RegistrationEntry,
} from '@agendya/types';
import { apiClient } from '../../shared/api/apiClient';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';

function formatAdminDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusStyle(status: AccessStatus): CSSProperties {
  if (status === 'APPROVED') {
    return {
      backgroundColor: 'var(--color-surface-soft)',
      color: 'var(--color-text-brand)',
    };
  }
  if (status === 'DECLINED') {
    return {
      backgroundColor: 'var(--color-danger-surface)',
      color: 'var(--color-danger)',
    };
  }
  return {
    backgroundColor: 'var(--color-surface-soft)',
    color: 'var(--color-text-secondary)',
  };
}

export function RegistrationsManager() {
  const [entries, setEntries] = useState<RegistrationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const { data } =
        await apiClient.get<RegistrationEntry[]>('/admin/registrations');
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo cargar los registros.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEntries();
  }, []);

  const handleStatus = async (
    email: string,
    status: 'APPROVED' | 'DECLINED',
  ) => {
    const verb = status === 'APPROVED' ? 'aceptar' : 'declinar';
    if (!confirm(`¿${verb.charAt(0).toUpperCase() + verb.slice(1)} a ${email}?`)) {
      return;
    }

    try {
      await apiClient.patch(
        `/admin/registrations/${encodeURIComponent(email)}`,
        { status },
      );
      await loadEntries();
    } catch (err) {
      setError(getApiErrorMessage(err, `No se pudo ${verb} el registro.`));
    }
  };

  return (
    <div className="max-w-6xl" style={{ fontFamily: 'var(--font-body)' }}>
      <h2
        className="text-2xl font-bold mb-4"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Registros
      </h2>
      <p
        className="text-sm mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Todas las cuentas creadas. Aceptar da acceso al panel; declinar lo
        bloquea. La lista de acceso de abajo es para invitar correos antes de
        que se registren.
      </p>

      {error && (
        <div
          className="p-4 mb-4 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--color-danger-surface)',
            color: 'var(--color-danger)',
            border: '1px solid var(--color-danger-border)',
          }}
        >
          {error}
        </div>
      )}

      {loading && entries.length === 0 ? (
        <div
          className="text-center py-8 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Cargando…
        </div>
      ) : entries.length === 0 ? (
        <div
          className="text-center py-8 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Aún no hay cuentas registradas.
        </div>
      ) : (
        <div
          className="rounded-lg overflow-x-auto"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Negocio
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Acceso
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Registro
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <td className="px-4 py-3 text-sm">{entry.email}</td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {entry.businessName}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={statusStyle(entry.accessStatus)}
                    >
                      {ACCESS_STATUS_LABELS[entry.accessStatus]}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {entry.plan}
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {formatAdminDate(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right space-x-2">
                    {entry.accessStatus !== 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleStatus(entry.email, 'APPROVED')
                        }
                        className="text-sm px-3 py-1 rounded"
                        style={{ color: 'var(--color-text-brand)' }}
                      >
                        Aceptar
                      </button>
                    )}
                    {entry.accessStatus !== 'DECLINED' &&
                      entry.role !== 'SUPER_ADMIN' && (
                        <button
                          type="button"
                          onClick={() =>
                            void handleStatus(entry.email, 'DECLINED')
                          }
                          className="text-sm px-3 py-1 rounded"
                          style={{ color: 'var(--color-danger)' }}
                        >
                          Declinar
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
