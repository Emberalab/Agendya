import { useEffect, useState } from 'react';
import {
  formatPlanWithInterval,
  type AllowlistEntry,
  type PlatformAccessKind,
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

export function AllowlistManager() {
  const [entries, setEntries] = useState<AllowlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newAccess, setNewAccess] = useState<PlatformAccessKind>('ALLOWLISTED');

  const loadEntries = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get<AllowlistEntry[]>('/admin/allowlist');
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo cargar la lista de acceso.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const { data } =
          await apiClient.get<AllowlistEntry[]>('/admin/allowlist');
        if (cancelled) return;
        setEntries(data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          getApiErrorMessage(err, 'No se pudo cargar la lista de acceso.'),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async () => {
    if (!newEmail.trim()) {
      setError('El correo no puede estar vacío.');
      return;
    }

    try {
      await apiClient.post('/admin/allowlist', {
        email: newEmail.trim(),
        access: newAccess,
      });
      setNewEmail('');
      setNewAccess('ALLOWLISTED');
      setShowForm(false);
      await loadEntries();
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo crear la entrada.'));
    }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`¿Eliminar el acceso de ${email}?`)) return;

    try {
      await apiClient.delete(`/admin/allowlist/${encodeURIComponent(email)}`);
      await loadEntries();
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo eliminar la entrada.'));
    }
  };

  const handleToggleAccess = async (
    email: string,
    currentAccess: PlatformAccessKind,
  ) => {
    const nextAccess: PlatformAccessKind =
      currentAccess === 'SUPER_ADMIN' ? 'ALLOWLISTED' : 'SUPER_ADMIN';
    const label = nextAccess === 'SUPER_ADMIN' ? 'Super Admin' : 'Permitido';

    if (!confirm(`¿Cambiar el grant de ${email} a ${label}?`)) return;

    try {
      await apiClient.patch(`/admin/allowlist/${encodeURIComponent(email)}`, {
        access: nextAccess,
      });
      await loadEntries();
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo actualizar el acceso.'));
    }
  };

  return (
    <div className="max-w-6xl" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Lista de acceso
        </h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'var(--color-brand-primary)',
            color: 'var(--color-text-on-brand)',
          }}
        >
          {showForm ? 'Cancelar' : 'Agregar correo'}
        </button>
      </div>

      <p
        className="text-sm mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Controla quién puede registrarse en Railway. Super Admin solo se asigna
        al crear la cuenta; cambiar el grant de alguien que ya existe no le
        cambia el rol.
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

      {showForm && (
        <div
          className="p-6 rounded-lg mb-6"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-surface-soft)',
                  border: '1px solid var(--color-border)',
                }}
                placeholder="usuario@ejemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Tipo de acceso
              </label>
              <select
                value={newAccess}
                onChange={(e) =>
                  setNewAccess(e.target.value as PlatformAccessKind)
                }
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-surface-soft)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <option value="ALLOWLISTED">Permitido</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => void handleCreate()}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: 'var(--color-brand-primary)',
                color: 'var(--color-text-on-brand)',
              }}
            >
              Crear
            </button>
          </div>
        </div>
      )}

      {loading && entries.length === 0 ? (
        <div
          className="text-center py-8 text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Cargando…
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
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
                  Acceso
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Comprado
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Vence
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
                  <td className="px-4 py-3 text-sm">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={
                        entry.access === 'SUPER_ADMIN'
                          ? {
                              backgroundColor: 'var(--color-brand-primary)',
                              color: 'var(--color-text-on-brand)',
                            }
                          : {
                              backgroundColor: 'var(--color-surface-soft)',
                              color: 'var(--color-text-secondary)',
                            }
                      }
                    >
                      {entry.access === 'SUPER_ADMIN'
                        ? 'Super Admin'
                        : 'Permitido'}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {entry.plan
                      ? formatPlanWithInterval(
                          entry.plan,
                          entry.billingInterval,
                        )
                      : 'Sin cuenta'}
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {formatAdminDate(entry.planStartedAt)}
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {formatAdminDate(entry.planExpiresAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right space-x-2">
                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleAccess(entry.email, entry.access)
                      }
                      className="text-sm px-3 py-1 rounded"
                      style={{ color: 'var(--color-text-brand)' }}
                    >
                      Cambiar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(entry.email)}
                      className="text-sm px-3 py-1 rounded"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      Eliminar
                    </button>
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
