import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  CANCELLATION_POLICY_HOURS_OPTIONS,
  PLAN_LABELS,
  cancellationPolicyHoursSchema,
  hexColorSchema,
  slugSchema,
  type ProfessionalProfile,
} from '@agendya/types';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { publicBookingUrl } from '../../shared/config/publicSiteUrl';
import { cloudinaryImageUrl } from '../../shared/image/cloudinary';
import { checkSlugAvailability, uploadImage } from './api';
import { useProfile } from './hooks/useProfile';
import { useUpdateProfile } from './hooks/useUpdateProfile';
import { hexToHue, hueToHex } from './color';
import { downscaleImage } from './image';

const profileFormSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, 'Ingresa al menos 2 caracteres.')
    .max(100, 'Máximo 100 caracteres.'),
  slug: slugSchema,
  category: z.string().trim().max(60, 'Máximo 60 caracteres.'),
  description: z.string().trim().max(500, 'Máximo 500 caracteres.'),
  logoUrl: z.string(),
  coverImageUrl: z.string(),
  brandColor: hexColorSchema,
  cancellationPolicyHours: cancellationPolicyHoursSchema,
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

/** Fields that count toward the completeness bar. */
const COMPLETION_FIELDS: (keyof ProfileFormValues)[] = [
  'businessName',
  'slug',
  'description',
  'logoUrl',
  'coverImageUrl',
  'brandColor',
];

const PLAN_PERKS = [
  'Programación automática',
  'Notificaciones por SMS',
  'Informes y estadísticas',
];

function toFormValues(profile: ProfessionalProfile): ProfileFormValues {
  return {
    businessName: profile.businessName,
    slug: profile.slug,
    category: profile.category ?? '',
    description: profile.description ?? '',
    logoUrl: profile.logoUrl ?? '',
    coverImageUrl: profile.coverImageUrl ?? '',
    brandColor: profile.brandColor ?? '#4F46E5',
    cancellationPolicyHours:
      profile.cancellationPolicyHours as ProfileFormValues['cancellationPolicyHours'],
  };
}

function cancellationLabel(hours: number): string {
  return hours === 1 ? '1 hora antes' : `${hours} horas antes`;
}

export function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const checkSlug = useMutation({ mutationFn: checkSlugAvailability });
  const uploadLogo = useMutation({
    mutationFn: (file: File) => uploadImage(file, 'logo'),
  });
  const uploadCover = useMutation({
    mutationFn: (file: File) => uploadImage(file, 'cover'),
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      businessName: '',
      slug: '',
      category: '',
      description: '',
      logoUrl: '',
      coverImageUrl: '',
      brandColor: '#4F46E5',
      cancellationPolicyHours: 24,
    },
  });

  useEffect(() => {
    if (profile) reset(toFormValues(profile));
  }, [profile, reset]);

  const values = watch();
  const filled = COMPLETION_FIELDS.filter((f) =>
    String(values[f] ?? '').trim(),
  ).length;
  const completion = Math.round((filled / COMPLETION_FIELDS.length) * 100);
  const isComplete = completion === 100;

  const onSubmit = handleSubmit((data) => {
    updateProfile.mutate(
      {
        businessName: data.businessName,
        slug: data.slug,
        category: data.category.trim() ? data.category.trim() : null,
        description: data.description.trim() ? data.description.trim() : null,
        logoUrl: data.logoUrl || null,
        coverImageUrl: data.coverImageUrl || null,
        brandColor: data.brandColor,
        cancellationPolicyHours: data.cancellationPolicyHours,
      },
      { onSuccess: () => reset(data) },
    );
  });

  if (isLoading || !profile) {
    return (
      <div
        className="rounded-2xl flex items-center justify-center py-16"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Cargando perfil…
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--font-body)' }} className="w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-[24px] lg:text-[28px]"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: '4px',
            }}
          >
            Perfil
          </h1>
          <p
            className="text-[13px] lg:text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Configura la información de tu negocio.
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1"
          style={{
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: isComplete ? '#DCFCE7' : '#FEF3C7',
            color: isComplete ? '#15803D' : '#B45309',
          }}
        >
          {isComplete ? 'Completo' : 'Incompleto'}
        </span>
      </div>

      {/* Completeness bar */}
      <div className="mt-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
            }}
          >
            Completitud del perfil
          </span>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--color-text-brand)',
            }}
          >
            {completion}%
          </span>
        </div>
        <div
          className="h-2 w-full rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--color-border)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${completion}%`,
              backgroundColor: 'var(--color-brand-primary)',
              transition: 'width 0.25s',
            }}
          />
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        {/* Información del negocio */}
        <Section
          title="Información del negocio"
          subtitle="Completa estos datos para que tu negocio se vea bien en la reserva."
        >
          <Field
            htmlFor="businessName"
            label="Nombre del negocio"
            required
            error={errors.businessName}
          >
            <input
              id="businessName"
              type="text"
              placeholder="Ej. Mi Barbería, Centro de Estética…"
              style={inputStyle}
              aria-invalid={!!errors.businessName}
              aria-describedby={errors.businessName ? 'businessName-error' : undefined}
              {...register('businessName')}
            />
          </Field>

          <Field
            htmlFor="category"
            label="Categoría"
            hint="Aparece como etiqueta en tu página pública."
            error={errors.category}
          >
            <input
              id="category"
              type="text"
              placeholder="Ej. Barbería, Spa, Consultorio…"
              style={inputStyle}
              aria-invalid={!!errors.category}
              aria-describedby={errors.category ? 'category-error' : 'category-hint'}
              {...register('category')}
            />
          </Field>

          <Field htmlFor="slug" label="Enlace público" error={errors.slug}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div
                className="flex items-center flex-1 rounded-lg overflow-hidden"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <span
                  className="pl-3 pr-1 shrink-0"
                  style={{
                    fontSize: '15px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  agendya.co/
                </span>
                <input
                  id="slug"
                  type="text"
                  placeholder="nombre-del-negocio"
                  style={{ ...inputStyle, border: 'none', paddingLeft: 0 }}
                  aria-invalid={!!errors.slug}
                  aria-describedby={errors.slug ? 'slug-error' : undefined}
                  {...register('slug')}
                />
              </div>
              <div className="flex gap-2 sm:shrink-0">
                <button
                  type="button"
                  disabled={!values.slug}
                  onClick={() =>
                    window.open(
                      publicBookingUrl(values.slug),
                      '_blank',
                      'noopener,noreferrer',
                    )
                  }
                  aria-label="Abrir mi página pública"
                  title="Abrir mi página pública"
                  className="shrink-0 flex items-center justify-center rounded-lg px-4 py-2.5"
                  style={{
                    border: '1px solid var(--color-border)',
                    background: 'none',
                    color: values.slug
                      ? 'var(--color-text-brand)'
                      : 'var(--color-text-muted)',
                    cursor: values.slug ? 'pointer' : 'not-allowed',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M9.5 2.5H13.5V6.5M13.5 2.5L7.5 8.5M11 9.5V12A1.5 1.5 0 0 1 9.5 13.5H4A1.5 1.5 0 0 1 2.5 12V6.5A1.5 1.5 0 0 1 4 5H6.5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={!values.slug || checkSlug.isPending}
                  onClick={() => checkSlug.mutate(values.slug)}
                  className="flex-1 sm:flex-none sm:shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold"
                  style={{
                    border: '1px solid var(--color-border)',
                    background: 'none',
                    color:
                      !values.slug || checkSlug.isPending
                        ? 'var(--color-text-muted)'
                        : 'var(--color-text-brand)',
                    cursor:
                      !values.slug || checkSlug.isPending
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {checkSlug.isPending
                    ? 'Verificando…'
                    : 'Verificar disponibilidad'}
                </button>
              </div>
            </div>
            {checkSlug.data && (
              <p
                className="mt-1.5"
                style={{
                  fontSize: '13px',
                  color: checkSlug.data.available ? '#15803D' : 'var(--color-danger)',
                }}
              >
                {checkSlug.data.available
                  ? 'Enlace disponible.'
                  : 'Ese enlace ya está en uso.'}
              </p>
            )}
          </Field>

          <Field htmlFor="description" label="Descripción" required error={errors.description}>
            <textarea
              id="description"
              placeholder="Describe tu negocio…"
              rows={4}
              style={{
                ...inputStyle,
                height: 'auto',
                minHeight: '110px',
                padding: '12px 14px',
                lineHeight: 1.55,
                resize: 'vertical',
              }}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'description-error' : undefined}
              {...register('description')}
            />
          </Field>
        </Section>

        {/* Identidad visual */}
        <Section
          title="Identidad visual"
          subtitle="Personaliza el aspecto de tu reserva."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Logo del negocio">
              <Controller
                control={control}
                name="logoUrl"
                render={({ field }) => (
                  <ImageDropzone
                    value={field.value}
                    onChange={field.onChange}
                    uploading={uploadLogo.isPending}
                    error={uploadLogo.error}
                    onFile={(file) =>
                      void downscaleImage(file, 512).then((f) =>
                        uploadLogo.mutate(f, {
                          onSuccess: (url) =>
                            setValue('logoUrl', url, { shouldDirty: true }),
                        }),
                      )
                    }
                    hint="PNG, JPG hasta 2MB"
                    ctaLabel="Sube tu logo"
                    aspect="square"
                  />
                )}
              />
            </Field>

            <Field label="Color de fondo">
              <Controller
                control={control}
                name="brandColor"
                render={({ field }) => (
                  <ColorPicker value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
          </div>

          <Field
            label="Imagen de fondo"
            hint="La imagen no puede superar más de 5 megas."
          >
            <Controller
              control={control}
              name="coverImageUrl"
              render={({ field }) => (
                <ImageDropzone
                  value={field.value}
                  onChange={field.onChange}
                  uploading={uploadCover.isPending}
                  error={uploadCover.error}
                  onFile={(file) =>
                    void downscaleImage(file, 1600).then((f) =>
                      uploadCover.mutate(f, {
                        onSuccess: (url) =>
                          setValue('coverImageUrl', url, {
                            shouldDirty: true,
                          }),
                      }),
                    )
                  }
                  hint="PNG, JPG hasta 5MB"
                  ctaLabel="Sube una imagen"
                  aspect="wide"
                />
              )}
            />
          </Field>
        </Section>

        {/* Tu plan */}
        <Section
          title="Tu plan"
          subtitle="Accede a más funcionalidades mejorando tu plan."
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '16px',
                  color: 'var(--color-text-primary)',
                }}
              >
                {PLAN_LABELS[profile.plan]}
              </p>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  marginTop: '2px',
                }}
              >
                Accede a más funcionalidades mejorando tu plan.
              </p>
            </div>
            <div className="min-w-[180px]">
              <p
                className="text-right"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}
              >
                {profile.bookingsThisMonth}/{profile.monthlyBookingLimit ?? '∞'}{' '}
                reservas este mes
              </p>
              {profile.monthlyBookingLimit != null && (
                <div
                  className="mt-1.5 h-2 w-full rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--color-border)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (profile.bookingsThisMonth /
                            profile.monthlyBookingLimit) *
                            100,
                        ),
                      )}%`,
                      backgroundColor: 'var(--color-brand-primary)',
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {profile.plan === 'BASIC' && (
            <>
              <p
                className="mt-6 mb-3"
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--color-text-primary)',
                }}
              >
                Te falta:
              </p>
              <ul className="flex flex-col gap-3.5">
                {PLAN_PERKS.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-center gap-3"
                    style={{
                      fontSize: '15px',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ color: '#94A3B8', flexShrink: 0 }}
                    >
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="2.5"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M12 8v8M8 12h8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    {perk}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="flex justify-end mt-5">
            <button
              type="button"
              className="rounded-xl px-9 py-4 font-semibold"
              style={{
                background:
                  'linear-gradient(135deg, #6366F1 0%, var(--color-brand-primary) 100%)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '15px',
                boxShadow:
                  '0 14px 28px -8px rgba(79, 70, 229, 0.55), 0 6px 12px -6px rgba(79, 70, 229, 0.4)',
                transition: 'box-shadow 0.15s, transform 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 18px 34px -8px rgba(79, 70, 229, 0.6), 0 8px 16px -6px rgba(79, 70, 229, 0.45)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 14px 28px -8px rgba(79, 70, 229, 0.55), 0 6px 12px -6px rgba(79, 70, 229, 0.4)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Mejorar plan
            </button>
          </div>
        </Section>

        {/* Configuración */}
        <Section
          title="Configuración"
          subtitle="Ajustes generales de tu reserva."
        >
          <Field
            htmlFor="cancellationPolicyHours"
            label="Política de cancelación"
            required
            hint="Tú puedes cancelar la cita hasta el tiempo indicado antes. Tu cliente también puede cancelar hasta el mismo tiempo antes de su cita."
          >
            <div style={{ position: 'relative' }}>
              <select
                id="cancellationPolicyHours"
                style={{
                  ...inputStyle,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  paddingRight: '34px',
                  cursor: 'pointer',
                }}
                aria-describedby="cancellationPolicyHours-hint"
                {...register('cancellationPolicyHours', {
                  valueAsNumber: true,
                })}
              >
                {CANCELLATION_POLICY_HOURS_OPTIONS.map((hours) => (
                  <option key={hours} value={hours}>
                    {cancellationLabel(hours)}
                  </option>
                ))}
              </select>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'var(--color-text-muted)',
                }}
              >
                <path
                  d="M2.5 4.5L6 8l3.5-3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </Field>
        </Section>

        {updateProfile.isError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 p-3">
            <p className="text-sm text-red-600 dark:text-red-400">
              {getApiErrorMessage(updateProfile.error)}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {updateProfile.isSuccess && !isDirty
              ? 'Cambios guardados.'
              : 'El botón se activará cuando realices cambios.'}
          </p>
          <button
            type="submit"
            disabled={!isDirty || updateProfile.isPending}
            className="w-full sm:w-auto rounded-xl px-5 py-3 text-sm font-semibold"
            style={{
              backgroundColor:
                !isDirty || updateProfile.isPending
                  ? 'var(--color-border)'
                  : 'var(--color-brand-primary)',
              color:
                !isDirty || updateProfile.isPending
                  ? 'var(--color-text-muted)'
                  : '#fff',
              border: 'none',
              cursor:
                !isDirty || updateProfile.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {updateProfile.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Modificado por última vez hoy
        </p>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const inputStyle = {
  width: '100%',
  height: '46px',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  padding: '0 14px',
  backgroundColor: 'var(--color-surface)',
  fontFamily: 'var(--font-body)',
  fontSize: '15px',
  color: 'var(--color-text-primary)',
  outline: 'none',
} as const;

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl p-6 lg:p-8"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '17px',
          color: 'var(--color-text-primary)',
        }}
      >
        {title}
      </h2>
      <p
        className="mb-6"
        style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          marginTop: '2px',
        }}
      >
        {subtitle}
      </p>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

function Field({
  htmlFor,
  label,
  required,
  hint,
  error,
  children,
}: {
  /** Matches the wrapped control's `id`, so the visible label is also its accessible name. */
  htmlFor?: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: { message?: string };
  children: React.ReactNode;
}) {
  const hintId = htmlFor && hint ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor && error?.message ? `${htmlFor}-error` : undefined;

  return (
    <div>
      <label
        htmlFor={htmlFor}
        style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: hint ? '4px' : '6px',
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
      </label>
      {hint && (
        <p
          id={hintId}
          className="mb-2"
          style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}
        >
          {hint}
        </p>
      )}
      {children}
      {error?.message && (
        <p
          id={errorId}
          role="alert"
          className="mt-1"
          style={{ fontSize: '12px', color: 'var(--color-danger)' }}
        >
          {error.message}
        </p>
      )}
    </div>
  );
}

function ImageDropzone({
  value,
  onChange,
  onFile,
  uploading,
  error,
  hint,
  ctaLabel,
  aspect,
}: {
  value: string;
  onChange: (v: string) => void;
  onFile: (file: File) => void;
  uploading: boolean;
  error: unknown;
  hint: string;
  ctaLabel: string;
  aspect: 'square' | 'wide';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const take = (file?: File | null) => {
    if (file) onFile(file);
  };

  const boxHeight = aspect === 'square' ? '150px' : '150px';

  if (value) {
    return (
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--color-border)', height: boxHeight }}
      >
        <img
          src={cloudinaryImageUrl(value, {
            width: aspect === 'square' ? 320 : 900,
          })}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-full h-full"
          style={{ objectFit: aspect === 'square' ? 'contain' : 'cover' }}
        />
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Quitar imagen"
          className="absolute top-2 right-2 flex items-center justify-center w-7 h-7 rounded-full"
          style={{
            backgroundColor: 'rgba(15,23,42,0.6)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 3l6 6M9 3l-6 6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          take(e.dataTransfer.files?.[0]);
        }}
        className="w-full flex flex-col items-center justify-center gap-2 rounded-xl"
        style={{
          height: boxHeight,
          border: `1.5px dashed ${
            dragOver ? 'var(--color-brand-primary)' : 'var(--color-brand-border)'
          }`,
          backgroundColor: dragOver ? 'var(--color-brand-surface)' : 'var(--color-surface-soft)',
          cursor: 'pointer',
        }}
      >
        <span
          className="flex items-center justify-center w-10 h-10 rounded-full"
          style={{ backgroundColor: 'var(--color-brand-surface)' }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            style={{ color: 'var(--color-text-brand)' }}
          >
            <path
              d="M9 12V4M5.5 7.5L9 4l3.5 3.5M3.5 13.5h11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text-brand)',
          }}
        >
          {uploading ? 'Subiendo…' : ctaLabel}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          {hint}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => take(e.target.files?.[0])}
      />
      {Boolean(error) && (
        <p className="mt-1" style={{ fontSize: '12px', color: 'var(--color-danger)' }}>
          {getApiErrorMessage(error)}
        </p>
      )}
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const hue = hexToHue(value);
  return (
    <div>
      <input
        type="range"
        min={0}
        max={360}
        value={hue}
        onChange={(e) => onChange(hueToHex(Number(e.target.value)))}
        aria-label="Color de fondo"
        className="agendia-hue-slider"
      />
      <div className="flex items-center gap-2.5 mt-3">
        <span
          className="w-8 h-8 rounded-lg shrink-0"
          style={{
            backgroundColor: value,
            border: '1px solid var(--color-border)',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            color: 'var(--color-text-primary)',
          }}
        >
          {value.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
