import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@ronda/types';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { useRegister } from './hooks/useRegister';

export function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit((data) => {
    registerMutation.mutate(data, {
      onSuccess: () => navigate('/dashboard/profile', { replace: true }),
    });
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold">Crea tu cuenta</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label
            htmlFor="businessName"
            className="mb-1 block text-sm font-medium"
          >
            Nombre de tu negocio
          </label>
          <input
            id="businessName"
            type="text"
            autoComplete="organization"
            placeholder="Ej. María Belleza, Peluquería Ana…"
            className="w-full rounded border border-gray-300 px-3 py-2"
            {...register('businessName')}
          />
          {errors.businessName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.businessName.message}
            </p>
          )}
        </div>
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
            autoComplete="new-password"
            className="w-full rounded border border-gray-300 px-3 py-2"
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>
        {registerMutation.isError && (
          <p className="text-sm text-red-600">
            {getApiErrorMessage(registerMutation.error)}
          </p>
        )}
        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {registerMutation.isPending ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
      <p className="mt-4 text-sm">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
