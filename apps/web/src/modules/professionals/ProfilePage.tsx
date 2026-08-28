import { zodResolver } from '@hookform/resolvers/zod';
import {
  BRAND_COLOR_OPTIONS,
  CANCELLATION_POLICY_HOURS_OPTIONS,
  updateProfileSchema,
  type ProfessionalProfile,
  type UpdateProfileInput,
} from '@agendya/types';
import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Button } from '../../shared/components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/components/Card';
import { Input } from '../../shared/components/Input';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { checkSlugAvailability, uploadImage } from './api';
import { useProfile } from './hooks/useProfile';
import { useUpdateProfile } from './hooks/useUpdateProfile';

function toFormValues(profile: ProfessionalProfile): UpdateProfileInput {
  return {
    businessName: profile.businessName,
    slug: profile.slug,
    description: profile.description ?? '',
    logoUrl: profile.logoUrl ?? '',
    brandColor: (profile.brandColor ?? '#F5F5F5') as typeof BRAND_COLOR_OPTIONS[number],
    cancellationPolicyHours:
      profile.cancellationPolicyHours as typeof CANCELLATION_POLICY_HOURS_OPTIONS[number],
  };
}

export function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const checkSlug = useMutation({ mutationFn: checkSlugAvailability });
  const uploadLogo = useMutation({ mutationFn: uploadImage });
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
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
  const logoUrlValue = watch('logoUrl');
  const brandColorValue = watch('brandColor');

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadLogo.mutateAsync(file);
      setValue('logoUrl', url, { shouldDirty: true });
    } catch (error) {
      console.error('Error uploading logo:', error);
    }
  };

  if (isLoading || !profile) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Cargando perfil…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Tu perfil</h1>
        <p className="text-gray-600">
          Esta información aparece en tu página pública de reservas.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tu enlace de reservas</CardTitle>
          <CardDescription>
            Comparte este enlace con tus clientes para que puedan reservar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <span className="flex-1 truncate text-sm text-gray-700">
              {bookingLink}
            </span>
            <Button
              type="button"
              onClick={handleCopyLink}
              variant="primary"
              size="sm"
            >
              {copied ? '¡Copiado!' : 'Copiar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Información del negocio</CardTitle>
          <CardDescription>
            Actualiza los datos que aparecen en tu página pública
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              id="businessName"
              type="text"
              label="Nombre de tu negocio"
              error={errors.businessName?.message}
              {...register('businessName')}
            />

            <div>
              <label htmlFor="slug" className="mb-1 block text-sm font-medium text-gray-700">
                Enlace público
              </label>
              <div className="flex gap-2">
                <Input
                  id="slug"
                  type="text"
                  error={errors.slug?.message}
                  {...register('slug')}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!slugValue || checkSlug.isPending}
                  onClick={() => slugValue && checkSlug.mutate(slugValue)}
                >
                  {checkSlug.isPending ? 'Verificando…' : 'Verificar'}
                </Button>
              </div>
              {checkSlug.data && (
                <p
                  className={`mt-1 text-sm ${checkSlug.data.available ? 'text-green-600' : 'text-red-600'}`}
                >
                  {checkSlug.data.available
                    ? '✓ Disponible'
                    : '✗ Ese enlace ya está en uso'}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Descripción
              </label>
              <textarea
                id="description"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
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
                htmlFor="logoUpload"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Logo del negocio
              </label>
              <div className="flex items-center gap-4">
                {logoUrlValue && (
                  <div className="relative">
                    <img
                      src={logoUrlValue}
                      alt="Logo"
                      className="h-16 w-16 rounded-lg border border-gray-300 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setValue('logoUrl', '', { shouldDirty: true });
                      }}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                      title="Eliminar logo"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    id="logoUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadLogo.isPending}
                    className="w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-900 hover:file:bg-gray-200"
                  />
                  {uploadLogo.isPending && (
                    <p className="mt-1 text-sm text-gray-500">Subiendo...</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="brandColor"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Color de fondo
              </label>
              <div className="flex gap-3">
                {BRAND_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setValue('brandColor', color, { shouldDirty: true })}
                    className={`h-12 w-12 rounded-lg border-2 transition-all ${
                      brandColorValue === color
                        ? 'border-black ring-2 ring-black ring-offset-2'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Selecciona un color claro para que el texto negro sea legible
              </p>
            </div>

            <div>
              <label
                htmlFor="cancellationPolicyHours"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Política de cancelación
              </label>
              <select
                id="cancellationPolicyHours"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
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
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">
                  {getApiErrorMessage(updateProfile.error)}
                </p>
              </div>
            )}
            {updateProfile.isSuccess && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-sm text-green-600">✓ Perfil actualizado correctamente</p>
              </div>
            )}

            <div>
              <Button
                type="submit"
                variant="primary"
                disabled={!isDirty || updateProfile.isPending}
              >
                {updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
