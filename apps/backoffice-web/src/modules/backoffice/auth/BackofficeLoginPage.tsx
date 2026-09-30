import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backofficeLogin } from './api';
import { useBackofficeAuthStore } from './backofficeAuthStore';
import { isBackofficeApiError } from '../shared/backofficeApiClient';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Card } from '../../../shared/components/Card';
import Logo from '../../../imports/LogoGroup';

export function BackofficeLoginPage() {
  const navigate = useNavigate();
  const setSession = useBackofficeAuthStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await backofficeLogin({ email, password });
      setSession(response);
      navigate('/backoffice', { replace: true });
    } catch (err) {
      if (isBackofficeApiError(err) && err.status === 401) {
        setError('Correo o contraseña incorrectos.');
      } else {
        setError('No se pudo iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-soft px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-3 size-8">
            <Logo />
          </div>
          <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">Agendya</p>
          <h1 className="mt-1 text-xl font-bold text-text-primary">Backoffice</h1>
          <p className="mt-1 text-sm text-text-muted">Acceso solo para el equipo interno de Agendya.</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="Correo"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            id="password"
            type="password"
            label="Contraseña"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
