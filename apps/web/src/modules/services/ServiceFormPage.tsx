import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  SERVICE_DURATION_OPTIONS,
  type CreateServiceInput,
  type Service,
} from '@agendya/types';
import { FormGroup, Input } from '@moondesignsystem/react';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { Toggle } from './components/Toggle';
import { formatDurationLong } from './format';
import { useCreateService } from './hooks/useCreateService';
import { useServices } from './hooks/useServices';
import { useUpdateService } from './hooks/useUpdateService';

const MAX_PRICE_CENTS = 100_000_000;

const serviceFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Ingresa al menos 2 caracteres.')
      .max(100, 'Máximo 100 caracteres.'),
    description: z.string().trim().max(500, 'Máximo 500 caracteres.'),
    durationMinutes: z.number().int().min(5).max(480),
    priceCents: z.number().int().min(0).max(MAX_PRICE_CENTS),
    isActive: z.boolean(),
    homeServiceEnabled: z.boolean(),
    homeDurationMinutes: z.number().int().min(5).max(480).nullable(),
    homePriceCents: z.number().int().min(0).max(MAX_PRICE_CENTS).nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.homeServiceEnabled) return;
    if (data.homeDurationMinutes == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['homeDurationMinutes'],
        message: 'Indica la duración a domicilio.',
      });
    }
    if (data.homePriceCents == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['homePriceCents'],
        message: 'Indica el precio a domicilio.',
      });
    }
  });

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

const CREATE_DEFAULTS: ServiceFormValues = {
  name: '',
  description: '',
  durationMinutes: 60,
  priceCents: 0,
  isActive: true,
  homeServiceEnabled: false,
  homeDurationMinutes: null,
  homePriceCents: null,
};

function toFormValues(service: Service): ServiceFormValues {
  return {
    name: service.name,
    description: service.description ?? '',
    durationMinutes: service.durationMinutes,
    priceCents: service.priceCents,
    isActive: service.isActive,
    homeServiceEnabled: service.homeServiceEnabled,
    homeDurationMinutes: service.homeDurationMinutes,
    homePriceCents: service.homePriceCents,
  };
}

function toPayload(values: ServiceFormValues): CreateServiceInput {
  return {
    name: values.name,
    description: values.description.trim() ? values.description.trim() : null,
    durationMinutes: values.durationMinutes,
    priceCents: values.priceCents,
    isActive: values.isActive,
    homeServiceEnabled: values.homeServiceEnabled,
    homeDurationMinutes: values.homeServiceEnabled
      ? values.homeDurationMinutes
      : null,
    homePriceCents: values.homeServiceEnabled ? values.homePriceCents : null,
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: 'var(--color-brand-primary)' }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: 'var(--color-brand-primary)',
          textTransform: 'uppercase',
        }}
      >
        {children}
      </span>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      className="mt-1"
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: '12px',
        color: 'var(--color-danger)',
      }}
    >
      {message}
    </p>
  );
}

function PriceField({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: number | null;
  onChange: (cents: number) => void;
}) {
  const pesos = value != null ? Math.round(value / 100) : 0;
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-3"
      style={{
        border: '1px solid var(--color-border)',
        height: '46px',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
      >
        <rect
          x="1"
          y="3"
          width="12"
          height="8"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path d="M1 6h12" stroke="currentColor" strokeWidth="1.3" />
      </svg>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          color: 'var(--color-text-muted)',
        }}
      >
        $
      </span>
      <input
        id={id}
        inputMode="numeric"
        value={pesos ? pesos.toLocaleString('es-CO') : ''}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '');
          onChange(digits ? Number(digits) * 100 : 0);
        }}
        placeholder="0"
        style={{
          border: 'none',
          outline: 'none',
          background: 'none',
          width: '100%',
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          color: 'var(--color-text-primary)',
        }}
      />
    </div>
  );
}

function DurationSelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: number | null;
  onChange: (minutes: number) => void;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        id={id}
        value={value != null ? String(value) : ''}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: '46px',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          padding: '0 34px 0 12px',
          appearance: 'none',
          WebkitAppearance: 'none',
          backgroundColor: 'var(--color-surface)',
          fontFamily: 'var(--font-body)',
          fontSize: '15px',
          color: 'var(--color-text-primary)',
          cursor: 'pointer',
        }}
      >
        {value == null && <option value="">Selecciona…</option>}
        {SERVICE_DURATION_OPTIONS.map((minutes) => (
          <option key={minutes} value={String(minutes)}>
            {formatDurationLong(minutes)}
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
  );
}

export function ServiceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const { data: services, isLoading: servicesLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();

  const service = id ? services?.find((s) => s.id === id) : undefined;

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: CREATE_DEFAULTS,
  });

  useEffect(() => {
    if (service) reset(toFormValues(service));
  }, [service, reset]);

  const homeServiceEnabled = watch('homeServiceEnabled');
  const pending = createService.isPending || updateService.isPending;
  const mutationError = createService.error || updateService.error;

  const onSubmit = handleSubmit((values) => {
    const payload = toPayload(values);
    if (isEdit && id) {
      updateService.mutate(
        { id, input: payload },
        { onSuccess: () => navigate('/dashboard/services') },
      );
    } else {
      createService.mutate(payload, {
        onSuccess: () => navigate('/dashboard/services'),
      });
    }
  });

  if (isEdit && servicesLoading) {
    return (
      <div
        className="rounded-2xl flex items-center justify-center py-16"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: 'var(--color-text-muted)',
          }}
        >
          Cargando servicio…
        </p>
      </div>
    );
  }

  if (isEdit && !service) {
    return (
      <div
        className="rounded-2xl flex flex-col items-center py-16"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '14px',
            color: 'var(--color-text-primary)',
            marginBottom: '4px',
          }}
        >
          Servicio no encontrado
        </p>
        <button
          onClick={() => navigate('/dashboard/services')}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-brand-primary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Volver a Servicios
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'var(--font-body)' }} className="w-full">
      <form onSubmit={onSubmit} className="w-full">
        <div
          className="rounded-2xl p-6 lg:p-8"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <SectionLabel>Detalles generales</SectionLabel>

          <div className="flex flex-col gap-7">
            <FormGroup>
              <FormGroup.Label htmlFor="name" className="agendia-label">
                Nombre del servicio *
              </FormGroup.Label>
              <Input
                id="name"
                type="text"
                placeholder="Ej. Corte sencillo"
                size="lg"
                variant="outline"
                style={{
                  height: '46px',
                  paddingLeft: '14px',
                  paddingRight: '14px',
                  fontSize: '15px',
                }}
                {...register('name')}
              />
              <FieldError message={errors.name?.message} />
            </FormGroup>

            <FormGroup>
              <FormGroup.Label htmlFor="description" className="agendia-label">
                Descripción
              </FormGroup.Label>
              <textarea
                id="description"
                placeholder="Describe brevemente el servicio…"
                rows={3}
                style={{
                  width: '100%',
                  minHeight: '104px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  padding: '12px 14px',
                  backgroundColor: 'var(--color-surface)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '15px',
                  lineHeight: '1.55',
                  color: 'var(--color-text-primary)',
                  resize: 'vertical',
                  outline: 'none',
                }}
                {...register('description')}
              />
              <FieldError message={errors.description?.message} />
            </FormGroup>

            <div className="grid gap-6 sm:grid-cols-2">
              <FormGroup>
                <FormGroup.Label
                  htmlFor="durationMinutes"
                  className="agendia-label"
                >
                  Duración *
                </FormGroup.Label>
                <Controller
                  control={control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <DurationSelect
                      id="durationMinutes"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <FieldError message={errors.durationMinutes?.message} />
              </FormGroup>

              <FormGroup>
                <FormGroup.Label htmlFor="priceCents" className="agendia-label">
                  Precio *
                </FormGroup.Label>
                <Controller
                  control={control}
                  name="priceCents"
                  render={({ field }) => (
                    <PriceField
                      id="priceCents"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <FieldError message={errors.priceCents?.message} />
              </FormGroup>
            </div>

            <div
              style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: '28px',
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    Servicio a domicilio
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    Activa esta opción si también ofreces este servicio a
                    domicilio.
                  </p>
                </div>
                <Controller
                  control={control}
                  name="homeServiceEnabled"
                  render={({ field }) => (
                    <Toggle
                      checked={field.value}
                      onChange={() => {
                        const next = !field.value;
                        field.onChange(next);
                        if (next) {
                          if (getValues('homeDurationMinutes') == null)
                            setValue(
                              'homeDurationMinutes',
                              getValues('durationMinutes'),
                            );
                          if (getValues('homePriceCents') == null)
                            setValue('homePriceCents', getValues('priceCents'));
                        }
                      }}
                    />
                  )}
                />
              </div>

              {homeServiceEnabled && (
                <div className="grid gap-6 sm:grid-cols-2 mt-5">
                  <FormGroup>
                    <FormGroup.Label
                      htmlFor="homeDurationMinutes"
                      className="agendia-label"
                    >
                      Duración a domicilio *
                    </FormGroup.Label>
                    <Controller
                      control={control}
                      name="homeDurationMinutes"
                      render={({ field }) => (
                        <DurationSelect
                          id="homeDurationMinutes"
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    <FieldError message={errors.homeDurationMinutes?.message} />
                  </FormGroup>

                  <FormGroup>
                    <FormGroup.Label
                      htmlFor="homePriceCents"
                      className="agendia-label"
                    >
                      Precio a domicilio *
                    </FormGroup.Label>
                    <Controller
                      control={control}
                      name="homePriceCents"
                      render={({ field }) => (
                        <PriceField
                          id="homePriceCents"
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    <FieldError message={errors.homePriceCents?.message} />
                  </FormGroup>
                </div>
              )}
            </div>

            <div
              className="flex items-start justify-between gap-4"
              style={{
                borderTop: '1px solid var(--color-border)',
                paddingTop: '28px',
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Estado activo
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    marginTop: '2px',
                  }}
                >
                  Permitir que los clientes vean y agenden este servicio
                  inmediatamente en línea.
                </p>
              </div>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Toggle
                    checked={field.value}
                    onChange={() => field.onChange(!field.value)}
                  />
                )}
              />
            </div>
          </div>
        </div>

        {mutationError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 mt-4">
            <p
              className="text-sm text-red-600"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {getApiErrorMessage(mutationError)}
            </p>
          </div>
        )}

        <div
          className="rounded-2xl p-5 mt-5 flex items-center justify-end gap-3"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/dashboard/services')}
            disabled={pending}
            className="px-6 py-3 rounded-xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              background: 'none',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              cursor: pending ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="px-6 py-3 rounded-xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--color-brand-primary)',
              color: '#fff',
              border: 'none',
              cursor: pending ? 'not-allowed' : 'pointer',
            }}
          >
            {pending ? 'Guardando…' : 'Guardar servicio'}
          </button>
        </div>

        <p
          className="text-center mt-3"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
          }}
        >
          Los cambios se guardarán automáticamente como borrador hasta que
          confirmes la creación.
        </p>
      </form>
    </div>
  );
}
