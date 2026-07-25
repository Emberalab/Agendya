import { zodResolver } from '@hookform/resolvers/zod';
import {
  CANCELLATION_POLICY_HOURS_OPTIONS,
  updateProfileSchema,
  type ProfessionalProfile,
  type UpdateProfileInput,
} from '@ronda/types';
import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { checkSlugAvailability } from './api';
import { useProfile } from './hooks/useProfile';
import { useUpdateProfile } from './hooks/useUpdateProfile';

function toFormValues(profile: ProfessionalProfile): UpdateProfileInput {
  return {
    businessName: profile.businessName,
    slug: profile.slug,
    description: profile.description ?? '',
    cancellationPolicyHours:
      profile.cancellationPolicyHours as (typeof CANCELLATION_POLICY_HOURS_OPTIONS)[number],
  };
}

export function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const checkSlug = useMutation({ mutationFn: checkSlugAvailability });
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
  });

  useEffect(() => {
    if (profile) {
      reset(toFormValues(profile));
    }
  }, [profile, reset]);

  const onSubmit = handleSubmit((data) => {
    updateProfile.mutate({
      ...data,
      description: data.description?.trim() ? data.description.trim() : null,
    });
  });

  const bookingLink = profile
    ? `${window.location.origin}/${profile.slug}`
    : '';

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(bookingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const slugValue = watch('slug');

  if (isLoading || !profile) {
    return <p>Cargando perfil…</p>;
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-2xl font-semibold">Tu perfil</h1>
      <p className="mb-6 text-sm text-gray-500">
        Esta información aparece en tu página pública de reservas.
      </p>

      <div className="mb-6 flex items-center gap-2 rounded border border-gray-200 bg-gray-50 p-3">
        <span className="flex-1 truncate text-sm">{bookingLink}</span>
        <button
          type="button"
          onClick={handleCopyLink}
          className="rounded bg-black px-3 py-1 text-sm text-white"
        >
          {copied ? '¡Copiado!' : 'Copiar enlace'}
        </button>
      </div>

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
          <label htmlFor="slug" className="mb-1 block text-sm font-medium">
            Enlace público
          </label>
          <div className="flex gap-2">
            <input
              id="slug"
              type="text"
              className="w-full rounded border border-gray-300 px-3 py-2"
              {...register('slug')}
            />
            <button
              type="button"
              disabled={!slugValue || checkSlug.isPending}
              onClick={() => slugValue && checkSlug.mutate(slugValue)}
              className="whitespace-nowrap rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
            >
              Verificar
            </button>
          </div>
          {errors.slug && (
            <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
          )}
          {checkSlug.data && (
            <p
              className={`mt-1 text-sm ${checkSlug.data.available ? 'text-green-600' : 'text-red-600'}`}
            >
              {checkSlug.data.available
                ? 'Disponible.'
                : 'Ese enlace ya está en uso.'}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-1 block text-sm font-medium"
          >
            Descripción
          </label>
          <textarea
            id="description"
            rows={3}
            className="w-full rounded border border-gray-300 px-3 py-2"
            {...register('description')}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">
              {errors.description.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="cancellationPolicyHours"
            className="mb-1 block text-sm font-medium"
          >
            Política de cancelación
          </label>
          <select
            id="cancellationPolicyHours"
            className="w-full rounded border border-gray-300 px-3 py-2"
            {...register('cancellationPolicyHours', { valueAsNumber: true })}
          >
            {CANCELLATION_POLICY_HOURS_OPTIONS.map((hours) => (
              <option key={hours} value={hours}>
                {hours} horas antes de la cita
              </option>
            ))}
          </select>
        </div>

        {updateProfile.isError && (
          <p className="text-sm text-red-600">
            {getApiErrorMessage(updateProfile.error)}
          </p>
        )}
        {updateProfile.isSuccess && (
          <p className="text-sm text-green-600">Perfil actualizado.</p>
        )}

        <button
          type="submit"
          disabled={!isDirty || updateProfile.isPending}
          className="self-start rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
