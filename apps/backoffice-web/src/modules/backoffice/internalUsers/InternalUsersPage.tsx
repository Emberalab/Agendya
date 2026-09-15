import { useState } from 'react';
import type { InternalRole } from '@agendya/types';
import { INTERNAL_ROLES } from '@agendya/types';
import {
  useCreateInternalUser,
  useInternalUsers,
  useUpdateInternalUserRole,
  useUpdateInternalUserStatus,
} from './hooks/useInternalUsers';
import { useBackofficeAuthStore } from '../auth/backofficeAuthStore';
import { ROLE_LABELS } from '../shared/permissions';
import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import { Badge } from '../../../shared/components/Badge';

export function InternalUsersPage() {
  const currentUser = useBackofficeAuthStore((state) => state.user);
  const { data: users, isLoading } = useInternalUsers();
  const createUser = useCreateInternalUser();
  const updateRole = useUpdateInternalUserRole();
  const updateStatus = useUpdateInternalUserStatus();

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<InternalRole>('SUPPORT');
  const [formError, setFormError] = useState<string | null>(null);

  const onCreate = async () => {
    setFormError(null);
    try {
      await createUser.mutateAsync({ email, name, password, role });
      setShowForm(false);
      setEmail('');
      setName('');
      setPassword('');
      setRole('SUPPORT');
    } catch {
      setFormError('No se pudo crear el usuario. Revisa los datos.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-text-primary">Usuarios internos</h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : 'Nuevo usuario'}
        </Button>
      </div>

      {showForm && (
        <Card className="mt-4">
          <div className="flex flex-col gap-3">
            <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input
              label="Contraseña temporal"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Mínimo 8 caracteres."
            />
            <Select label="Rol" value={role} onChange={(e) => setRole(e.target.value as InternalRole)}>
              {INTERNAL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
            {formError && <p className="text-sm text-danger">{formError}</p>}
            <Button size="sm" disabled={!email || !name || password.length < 8 || createUser.isPending} onClick={onCreate}>
              {createUser.isPending ? 'Creando…' : 'Crear'}
            </Button>
          </div>
        </Card>
      )}

      <Card className="mt-4" padding="none">
        {isLoading && <p className="p-4 text-sm text-text-muted">Cargando…</p>}
        {users && (
          <ul className="divide-y divide-border">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {u.name} {u.id === currentUser?.id && <span className="text-xs text-text-muted">(tú)</span>}
                  </p>
                  <p className="text-xs text-text-muted">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!u.isActive && <Badge variant="danger">Inactivo</Badge>}
                  <div className="w-40">
                    <Select
                      value={u.role}
                      disabled={updateRole.isPending}
                      aria-label={`Rol de ${u.name}`}
                      onChange={(e) =>
                        updateRole.mutate({
                          id: u.id,
                          input: { role: e.target.value as InternalRole },
                        })
                      }
                    >
                      {INTERNAL_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateStatus.isPending}
                    onClick={() =>
                      updateStatus.mutate({
                        id: u.id,
                        input: { isActive: !u.isActive },
                      })
                    }
                  >
                    {u.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
