import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@ronda/types';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { useLogin } from './hooks/useLogin';

export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((data) => {
    loginMutation.mutate(data, {
      onSuccess: () => navigate('/dashboard/profile', { replace: true }),
    });
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold">Inicia sesión</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Correo
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded border border-gray-300 px-3 py-2"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded border border-gray-300 px-3 py-2"
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>
        {loginMutation.isError && (
          <p className="text-sm text-red-600">
            {getApiErrorMessage(loginMutation.error)}
          </p>
        )}
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {loginMutation.isPending ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
      <p className="mt-4 text-sm">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="underline">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
