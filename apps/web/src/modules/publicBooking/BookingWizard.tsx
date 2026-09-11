import type { PublicBooking, PublicProfessional } from '@agendya/types';
import { createBookingSchema } from '@agendya/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { isApiError } from '../../shared/api/apiClient';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { cloudinaryImageUrl } from '../../shared/image/cloudinary';
import { formatCOP, formatDuration } from '../services/format';
import { Toggle } from '../services/components/Toggle';
import { Calendar } from './components/Calendar';
import { MobileStickyCta } from './components/MobileStickyCta';
import { loadSavedCustomer, persistCustomer } from './customerStore';
import { useAvailability } from './hooks/useAvailability';
import { useCreateBooking } from './hooks/useCreateBooking';
import { useUpdateBookingByToken } from './hooks/useUpdateBookingByToken';

const STEPS = [
  { id: 'service', label: 'Servicio' },
  { id: 'modality', label: 'Modalidad' },
  { id: 'datetime', label: 'Fecha/Hora' },
  { id: 'details', label: 'Datos' },
  { id: 'confirm', label: 'Confirmar' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

const customerInfoSchema = createBookingSchema.pick({
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  customerNote: true,
});

type CustomerInfoInput = z.infer<typeof customerInfoSchema>;

// `customerAddress` isn't part of `customerInfoSchema` above — it's built
// from four separate free-text fields (see `composeAddress`) rather than
// filled directly, so it never went through react-hook-form's zodResolver
// like the rest of the "details" step. That let a long "Referencia para el
// profesional" silently blow past the backend's 200-char cap: the wizard let
// the customer click through every step, and the rejection only surfaced as
// a generic "Validation failed" on the final confirm. Validate the composed
// string against the same schema field the backend enforces, so the limit is
// never duplicated as a second magic number that can drift from it.
const addressSchema = createBookingSchema.shape.customerAddress;
// Display-only mirror of `addressSchema`'s `max(200)` (zod doesn't expose a
// clean way to read a check's numeric bound back out) — `addressSchema` itself,
// not this constant, is what actually gates "Continuar", so a value here that
// drifted from the schema could only make the counter's number wrong, never
// let an over-limit address slip past the real check.
const ADDRESS_MAX_LENGTH = 200;

interface AddressFields {
  line: string;
  unit: string;
  neighborhood: string;
  reference: string;
}

/** True when a booking failed because the chosen time is no longer bookable. */
function isTimeConflict(error: unknown): boolean {
  if (!isApiError(error)) return false;
  const status = error.status;
  if (status === 409) return true;
  const data = error.data as { message?: string } | undefined;
  return (
    status === 400 &&
    typeof data?.message === 'string' &&
    /disponible|horario/i.test(data.message)
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Flattens the structured at-home address fields into a single string. */
function composeAddress(fields: AddressFields): string {
  const parts = [
    fields.line.trim(),
    fields.unit.trim(),
    fields.neighborhood.trim(),
  ].filter(Boolean);
  let result = parts.join(', ');
  const reference = fields.reference.trim();
  if (reference) {
    result = result ? `${result} (Ref.: ${reference})` : `Ref.: ${reference}`;
  }
  return result;
}

/** Seed values for editing an already-confirmed booking. */
export interface BookingWizardInitialValues {
  serviceId: string;
  atHome: boolean;
  address: string | null;
  startAtISO: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNote: string;
}

interface BookingWizardProps {
  slug: string;
  professional: PublicProfessional;
  initialServiceId?: string | null;
  /** `'edit'` reopens the wizard prefilled and PATCHes the booking on submit. */
  mode?: 'create' | 'edit';
  /** Cancellation token of the booking being edited; required when `mode` is `'edit'`. */
  editToken?: string;
  initialValues?: BookingWizardInitialValues;
  onConfirmed: (booking: PublicBooking) => void;
  onExit: () => void;
}

export function BookingWizard({
  slug,
  professional,
  initialServiceId,
  mode = 'create',
  editToken,
  initialValues,
  onConfirmed,
  onExit,
}: BookingWizardProps) {
  const isEdit = mode === 'edit';
  const [stepIndex, setStepIndex] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(
    initialValues?.serviceId ?? initialServiceId ?? null,
  );
  const [atHome, setAtHome] = useState<boolean | null>(
    initialValues ? initialValues.atHome : null,
  );
  const [addressFields, setAddressFields] = useState<AddressFields>({
    line: initialValues?.address ?? '',
    unit: '',
    neighborhood: '',
    reference: '',
  });
  const [date, setDate] = useState(
    initialValues ? initialValues.startAtISO.slice(0, 10) : '',
  );
  const [slot, setSlot] = useState<string | null>(
    initialValues?.startAtISO ?? null,
  );
  const originalDate = initialValues
    ? initialValues.startAtISO.slice(0, 10)
    : null;
  const originalSlot = initialValues?.startAtISO ?? null;

  const currentStep: StepId = STEPS[stepIndex].id;
  const today = new Date().toISOString().slice(0, 10);

  const service = useMemo(
    () => professional.services.find((s) => s.id === serviceId) ?? null,
    [professional.services, serviceId],
  );
  const homeAvailable = service?.homeServiceEnabled ?? false;
  const effectiveDuration = service
    ? atHome && service.homeDurationMinutes != null
      ? service.homeDurationMinutes
      : service.durationMinutes
    : 0;
  const effectivePrice = service
    ? atHome && service.homePriceCents != null
      ? service.homePriceCents
      : service.priceCents
    : 0;

  const availability = useAvailability(
    slug,
    serviceId ? [serviceId] : [],
    date,
    atHome === true,
  );
  const createBooking = useCreateBooking(slug);
  const updateBooking = useUpdateBookingByToken(editToken ?? '');
  const activeMutation = isEdit ? updateBooking : createBooking;
  const [slotTakenNotice, setSlotTakenNotice] = useState<string | null>(null);

  const [savedCustomer] = useState(loadSavedCustomer);
  const [remember, setRemember] = useState(savedCustomer.remember);

  const {
    register,
    watch,
    trigger,
    getValues,
    formState: { errors, isValid },
  } = useForm<CustomerInfoInput>({
    resolver: zodResolver(customerInfoSchema),
    mode: 'onChange',
    defaultValues: {
      customerName: initialValues?.customerName ?? savedCustomer.name,
      customerEmail: initialValues?.customerEmail ?? savedCustomer.email,
      customerPhone: initialValues?.customerPhone ?? savedCustomer.phone,
      customerNote: initialValues?.customerNote ?? '',
    },
  });
  const customer = watch();

  // Selecting a service (or going back to change it) can invalidate a
  // previously-picked at-home modality and any chosen slot. Skip the first run
  // in edit mode so the seeded modality/slot survive mount.
  const serviceEffectMounted = useRef(false);
  useEffect(() => {
    if (isEdit && !serviceEffectMounted.current) {
      serviceEffectMounted.current = true;
      return;
    }
    if (atHome && !homeAvailable) {
      setAtHome(null);
    }
    setSlot(null);
  }, [serviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const composedAddress = composeAddress(addressFields);
  // Validated against the same schema field the backend enforces (min 5,
  // max 200) instead of a hand-rolled length check, so a long "Referencia
  // para el profesional" is caught here — with a message the customer can
  // act on — rather than surfacing as a generic rejection on final submit.
  const addressValid = addressSchema.safeParse(composedAddress).success;
  const addressTooLong = composedAddress.length > ADDRESS_MAX_LENGTH;

  const canContinue = (() => {
    switch (currentStep) {
      case 'service':
        return serviceId != null;
      case 'modality':
        return atHome === false || (atHome === true && addressValid);
      case 'datetime':
        return Boolean(date && slot);
      case 'details':
        return isValid;
      case 'confirm':
        return !activeMutation.isPending;
      default:
        return false;
    }
  })();

  const datetimeStepIndex = STEPS.findIndex((s) => s.id === 'datetime');

  // In edit mode the booking's own slot is absent from availability (it holds
  // that slot); keep it selectable while its original date is still chosen.
  const stepSlots = (() => {
    const base = availability.data ?? [];
    if (
      isEdit &&
      originalSlot &&
      date === originalDate &&
      !base.includes(originalSlot)
    ) {
      return [...base, originalSlot].sort();
    }
    return base;
  })();

  const submit = () => {
    if (!serviceId || !slot) return;
    const values = getValues();
    const note = values.customerNote?.trim();
    activeMutation.mutate(
      {
        serviceIds: serviceId,
        startAt: slot,
        customerName: values.customerName,
        customerEmail: values.customerEmail,
        customerPhone: values.customerPhone,
        ...(note ? { customerNote: note } : {}),
        atHome: atHome === true,
        ...(atHome === true ? { customerAddress: composedAddress } : {}),
      },
      {
        onSuccess: (booking) => {
          persistCustomer({
            name: values.customerName,
            email: values.customerEmail,
            phone: values.customerPhone,
            remember,
          });
          onConfirmed(booking);
        },
        onError: (error) => {
          // A time conflict means the slot is gone (taken, or the working
          // hours changed). Send the customer back to pick another one.
          if (isTimeConflict(error)) {
            setSlot(null);
            setSlotTakenNotice(
              'Ese horario ya no está disponible. Elige otro para continuar.',
            );
            setStepIndex(datetimeStepIndex);
            activeMutation.reset();
          }
        },
      },
    );
  };

  const goNext = async () => {
    if (currentStep === 'details') {
      const ok = await trigger();
      if (!ok) return;
    }
    if (currentStep === 'confirm') {
      submit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => {
    // From the at-home address sub-view, step back to the modality choice.
    if (currentStep === 'modality' && atHome === true) {
      setAtHome(null);
      return;
    }
    if (stepIndex === 0) {
      onExit();
      return;
    }
    setStepIndex((i) => i - 1);
  };

  const slotStart = slot ? new Date(slot) : null;
  const slotEnd = slotStart
    ? new Date(slotStart.getTime() + effectiveDuration * 60_000)
    : null;
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString('es-CO', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  const slotDateLabel = slotStart
    ? capitalize(
        slotStart.toLocaleDateString('es-CO', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }),
      )
    : null;
  const slotTimeRange =
    slotStart && slotEnd ? `${fmtTime(slotStart)} – ${fmtTime(slotEnd)}` : null;
  const slotLabel =
    slotDateLabel && slotTimeRange
      ? `${slotDateLabel} · ${slotTimeRange}`
      : null;
  const modalityLabel =
    atHome == null ? null : atHome ? 'A domicilio' : 'En el establecimiento';

  const editStep = (step: StepId) => {
    setSlotTakenNotice(null);
    setStepIndex(STEPS.findIndex((s) => s.id === step));
  };

  // Single source of truth for the primary action's label — shared by the
  // in-flow summary CTA and the mobile sticky CTA.
  const ctaLabel =
    currentStep === 'confirm'
      ? isEdit
        ? activeMutation.isPending
          ? 'Guardando…'
          : 'Guardar cambios'
        : activeMutation.isPending
          ? 'Reservando…'
          : 'Confirmar reserva'
      : 'Continuar →';

  // The real, in-flow CTA button (inside <Summary>). The mobile sticky bar
  // observes it and slides away whenever it is on screen.
  const primaryCtaRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-32 lg:py-10">
      <button
        type="button"
        onClick={goBack}
        className="mb-4 inline-flex items-center gap-1"
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span aria-hidden>←</span> {stepIndex === 0 ? 'Volver' : 'Atrás'}
      </button>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="min-w-0 flex-1 lg:order-1">
          <Stepper
            current={stepIndex}
            onStepClick={(i) => i < stepIndex && setStepIndex(i)}
          />

          <BusinessCard professional={professional} className="mt-6" />

          <div className="mt-8">
            {currentStep === 'service' && (
              <ServiceStep
                professional={professional}
                selectedId={serviceId}
                onSelect={setServiceId}
              />
            )}

            {currentStep === 'modality' &&
              service &&
              (atHome === true ? (
                <AddressStep
                  value={addressFields}
                  onChange={setAddressFields}
                  showLineError={
                    addressFields.line.trim().length > 0 &&
                    addressFields.line.trim().length < 5
                  }
                  addressLength={composedAddress.length}
                  addressTooLong={addressTooLong}
                />
              ) : (
                <ModalityStep
                  service={service}
                  homeAvailable={homeAvailable}
                  atHome={atHome}
                  onSelect={setAtHome}
                />
              ))}

            {currentStep === 'datetime' && (
              <DateTimeStep
                today={today}
                date={date}
                onDateChange={(value) => {
                  setDate(value);
                  setSlot(null);
                  setSlotTakenNotice(null);
                }}
                slots={stepSlots}
                isLoading={availability.isLoading}
                isError={availability.isError}
                slot={slot}
                onSlotSelect={(value) => {
                  setSlot(value);
                  setSlotTakenNotice(null);
                }}
                notice={slotTakenNotice}
              />
            )}

            {currentStep === 'details' && (
              <DetailsStep
                register={register}
                errors={errors}
                remember={remember}
                onRememberChange={setRemember}
              />
            )}

            {currentStep === 'confirm' && service && (
              <ConfirmStep
                serviceName={service.name}
                modalityLabel={modalityLabel ?? '—'}
                dateLabel={slotDateLabel ?? '—'}
                timeRange={slotTimeRange ?? '—'}
                durationMinutes={effectiveDuration}
                priceCents={effectivePrice}
                address={atHome ? composedAddress : null}
                customer={customer}
                error={activeMutation.error}
                onEdit={editStep}
              />
            )}
          </div>
        </div>

        <aside className="lg:order-2 lg:w-[340px] lg:shrink-0">
          <Summary
            serviceName={service?.name ?? null}
            modalityLabel={modalityLabel}
            slotLabel={slotLabel}
            customerName={customer.customerName || null}
            ctaLabel={ctaLabel}
            ctaDisabled={!canContinue}
            onCta={goNext}
            ctaRef={primaryCtaRef}
          />
        </aside>
      </div>

      <MobileStickyCta
        label={ctaLabel}
        disabled={!canContinue}
        onClick={goNext}
        anchorRef={primaryCtaRef}
      />
    </div>
  );
}

function Stepper({
  current,
  onStepClick,
}: {
  current: number;
  onStepClick: (index: number) => void;
}) {
  return (
    <ol
      className="flex items-center gap-1 overflow-x-auto rounded-2xl px-4 py-3 sm:gap-2 sm:px-6 sm:py-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const filled = done || active;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => onStepClick(index)}
              disabled={index >= current}
              className="flex shrink-0 items-center gap-2"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: index < current ? 'pointer' : 'default',
              }}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: filled
                    ? 'var(--color-brand-primary)'
                    : 'var(--color-surface)',
                  color: filled ? '#fff' : 'var(--color-text-muted)',
                  border: filled ? 'none' : '1px solid var(--color-border)',
                }}
              >
                {done ? '✓' : index + 1}
              </span>
              <span
                className="hidden whitespace-nowrap sm:inline"
                style={{
                  fontSize: '13px',
                  fontWeight: active ? 700 : done ? 600 : 500,
                  color: active
                    ? 'var(--color-text-brand)'
                    : done
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-muted)',
                }}
              >
                {step.label}
              </span>
            </button>
            {index < STEPS.length - 1 && (
              <span
                className="h-px flex-1"
                style={{
                  minWidth: '12px',
                  backgroundColor: 'var(--color-border)',
                }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function BusinessCard({
  professional,
  className = '',
}: {
  professional: PublicProfessional;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl ${className}`}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="relative">
        {professional.coverImageUrl ? (
          <img
            src={cloudinaryImageUrl(professional.coverImageUrl, { width: 1600 })}
            alt=""
            width={1600}
            height={600}
            fetchPriority="high"
            decoding="async"
            className="h-36 w-full object-cover sm:h-44"
          />
        ) : (
          <div
            className="h-36 w-full sm:h-44"
            style={{
              background: `linear-gradient(135deg, ${
                professional.brandColor ?? '#4F46E5'
              }, #0F172A)`,
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(79,70,229,0.12) 0%, rgba(15,23,42,0.34) 100%)',
          }}
        />
      </div>
      <div className="relative z-10 px-6 pb-6">
        <div
          className="-mt-11 flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-full"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '4px solid var(--color-surface)',
            boxShadow: '0 8px 24px rgba(15,23,42,0.18)',
          }}
        >
          {professional.logoUrl ? (
            <img
              src={cloudinaryImageUrl(professional.logoUrl, { width: 168 })}
              alt={professional.businessName}
              width={168}
              height={168}
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '28px',
                color: 'var(--color-text-primary)',
              }}
            >
              {professional.businessName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '24px',
              color: 'var(--color-text-primary)',
            }}
          >
            {professional.businessName}
          </h2>
          {professional.category && (
            <span
              className="rounded-full px-3 py-1"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'var(--color-brand-surface)',
                color: 'var(--color-text-brand)',
              }}
            >
              {professional.category}
            </span>
          )}
        </div>
        {professional.description && (
          <p
            className="mt-1.5"
            style={{
              fontSize: '14px',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
            }}
          >
            {professional.description}
          </p>
        )}
      </div>
    </div>
  );
}

function ServiceStep({
  professional,
  selectedId,
  onSelect,
}: {
  professional: PublicProfessional;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '22px',
          color: 'var(--color-text-primary)',
        }}
      >
        Elige un servicio
      </h3>
      <p
        className="mt-1"
        style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}
      >
        Selecciona la opción de tu preferencia para continuar
      </p>

      {professional.services.length === 0 ? (
        <p
          className="mt-6 rounded-xl px-4 py-6 text-center"
          style={{
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          Este negocio todavía no tiene servicios disponibles.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {professional.services.map((s) => {
            const isSelected = s.id === selectedId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                className="rounded-2xl p-5 text-left transition-colors"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: `${isSelected ? '2px' : '1px'} solid ${
                    isSelected
                      ? 'var(--color-brand-primary)'
                      : 'var(--color-border)'
                  }`,
                  boxShadow: isSelected
                    ? '0 0 0 4px rgba(79,70,229,0.10)'
                    : 'none',
                  cursor: 'pointer',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '17px',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {s.name}
                  </p>
                  <p
                    className="shrink-0"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '17px',
                      color: 'var(--color-text-brand)',
                    }}
                  >
                    {formatCOP(s.priceCents)}
                  </p>
                </div>
                {s.description && (
                  <p
                    className="mt-1.5"
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.5,
                    }}
                  >
                    {s.description}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    <ClockIcon />
                    {formatDuration(s.durationMinutes)}
                  </span>
                  {s.homeServiceEnabled && (
                    <span
                      className="rounded-full px-2.5 py-1"
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                      }}
                    >
                      A domicilio disponible
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModalityStep({
  service,
  homeAvailable,
  atHome,
  onSelect,
}: {
  service: PublicProfessional['services'][number];
  homeAvailable: boolean;
  atHome: boolean | null;
  onSelect: (value: boolean) => void;
}) {
  return (
    <div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '22px',
          color: 'var(--color-text-primary)',
        }}
      >
        ¿Dónde quieres recibir el servicio?
      </h3>
      <p
        className="mt-1"
        style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}
      >
        Elige entre visitarnos o ir a tu ubicación
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <ModalityRow
          selected={atHome === false}
          disabled={false}
          icon={<StoreIcon />}
          title="En el establecimiento"
          priceCents={service.priceCents}
          durationMinutes={service.durationMinutes}
          onClick={() => onSelect(false)}
        />
        <ModalityRow
          selected={atHome === true}
          disabled={!homeAvailable}
          icon={<HomeIcon />}
          title="A domicilio"
          unavailableLabel={
            homeAvailable ? undefined : 'No disponible para este servicio'
          }
          priceCents={service.homePriceCents ?? service.priceCents}
          durationMinutes={
            service.homeDurationMinutes ?? service.durationMinutes
          }
          onClick={() => homeAvailable && onSelect(true)}
        />
      </div>

      <p
        className="mt-4"
        style={{
          fontSize: '12px',
          fontStyle: 'italic',
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
        }}
      >
        La duración y precio final pueden variar según la modalidad seleccionada
        debido al tiempo de traslado.
      </p>
    </div>
  );
}

function AddressStep({
  value,
  onChange,
  showLineError,
  addressLength,
  addressTooLong,
}: {
  value: AddressFields;
  onChange: (next: AddressFields) => void;
  showLineError: boolean;
  /** Length of the composed address (line + unit + neighborhood + reference) the backend will actually receive. */
  addressLength: number;
  addressTooLong: boolean;
}) {
  const set =
    (key: keyof AddressFields) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [key]: event.target.value });

  return (
    <div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '22px',
          color: 'var(--color-text-primary)',
        }}
      >
        ¿Dónde será el servicio?
      </h3>

      <div className="mt-4 flex flex-col gap-4">
        <AddressField
          id="addr-line"
          label="Dirección"
          required
          placeholder="Ej: Calle 10 #43C-20"
          value={value.line}
          onChange={set('line')}
          error={
            showLineError ? 'Ingresa una dirección más detallada.' : undefined
          }
        />
        <AddressField
          id="addr-unit"
          label="Apartamento, casa o interior"
          placeholder="Ej: Apto 502, Torre 1"
          value={value.unit}
          onChange={set('unit')}
        />
        <AddressField
          id="addr-neighborhood"
          label="Barrio o sector"
          placeholder="Ej: El Poblado"
          value={value.neighborhood}
          onChange={set('neighborhood')}
        />
        <AddressField
          id="addr-reference"
          label="Referencia para el profesional"
          placeholder="Ej: Portón negro, timbre del apto"
          value={value.reference}
          onChange={set('reference')}
          describedBy="addr-length-hint"
        />
        <p
          id="addr-length-hint"
          aria-live="polite"
          style={{
            fontSize: '12px',
            color: addressTooLong
              ? 'var(--color-danger)'
              : 'var(--color-text-muted)',
          }}
        >
          {addressTooLong
            ? `La dirección completa es muy larga: tiene ${addressLength} de ${ADDRESS_MAX_LENGTH} caracteres permitidos. Acorta la dirección o la referencia para continuar.`
            : `${addressLength}/${ADDRESS_MAX_LENGTH} caracteres de la dirección completa.`}
        </p>
      </div>
    </div>
  );
}

function AddressField({
  id,
  label,
  placeholder,
  value,
  onChange,
  required,
  error,
  describedBy,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  error?: string;
  describedBy?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block"
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
      </label>
      <input
        id={id}
        type="text"
        aria-describedby={describedBy}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2.5"
        style={{
          fontSize: '14px',
          color: 'var(--color-text-primary)',
          backgroundColor: 'var(--color-surface)',
          border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
        }}
      />
      {error && (
        <p className="mt-1.5" style={{ fontSize: '13px', color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

function ModalityRow({
  selected,
  disabled,
  icon,
  title,
  priceCents,
  durationMinutes,
  unavailableLabel,
  onClick,
}: {
  selected: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  title: string;
  priceCents: number;
  durationMinutes: number;
  unavailableLabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-4 rounded-2xl p-5 text-left"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `${selected ? '2px' : '1px'} solid ${
          selected ? 'var(--color-text-brand)' : 'var(--color-border)'
        }`,
        boxShadow: selected ? '0 0 0 4px rgba(79,70,229,0.10)' : 'none',
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{
          backgroundColor: 'var(--color-surface-soft)',
          color: 'var(--color-text-brand)',
        }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '16px',
            color: 'var(--color-text-primary)',
          }}
        >
          {title}
        </span>
        <span
          className="mt-0.5 block"
          style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}
        >
          {unavailableLabel ??
            `${formatDuration(durationMinutes)} · ${formatCOP(priceCents)}`}
        </span>
      </span>
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{
          border: `2px solid ${
            selected ? 'var(--color-text-brand)' : 'var(--color-border)'
          }`,
        }}
      >
        {selected && (
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: 'var(--color-brand-primary)' }}
          />
        )}
      </span>
    </button>
  );
}

function DateTimeStep({
  today,
  date,
  onDateChange,
  slots,
  isLoading,
  isError,
  slot,
  onSlotSelect,
  notice,
}: {
  today: string;
  date: string;
  onDateChange: (value: string) => void;
  slots: string[];
  isLoading: boolean;
  isError: boolean;
  slot: string | null;
  onSlotSelect: (value: string) => void;
  notice: string | null;
}) {
  return (
    <div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '22px',
          color: 'var(--color-text-primary)',
        }}
      >
        Elige una fecha
      </h3>

      {notice && (
        <div
          role="alert"
          className="mt-3 rounded-xl px-4 py-3"
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#B45309',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
          }}
        >
          {notice}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="lg:w-[340px] lg:shrink-0">
          <Calendar value={date} min={today} onChange={onDateChange} />
        </div>

        {date && (
          <div className="min-w-0 flex-1">
            <p
              className="mb-3"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}
            >
              Hora disponible
            </p>
            {isError ? (
              <p
                className="rounded-xl px-4 py-6 text-center"
                style={{
                  fontSize: '14px',
                  color: 'var(--color-danger)',
                  backgroundColor: 'var(--color-surface-soft)',
                  border: '1px solid var(--color-border)',
                }}
              >
                No pudimos cargar los horarios. Intenta de nuevo.
              </p>
            ) : (
              <SlotPills
                slots={slots}
                isLoading={isLoading}
                selectedSlot={slot}
                onSelect={onSlotSelect}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SlotPills({
  slots,
  isLoading,
  selectedSlot,
  onSelect,
}: {
  slots: string[];
  isLoading: boolean;
  selectedSlot: string | null;
  onSelect: (slot: string) => void;
}) {
  if (isLoading) {
    return (
      <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
        Buscando horarios disponibles…
      </p>
    );
  }

  if (slots.length === 0) {
    return (
      <p
        className="rounded-xl px-4 py-6 text-center"
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          backgroundColor: 'var(--color-surface-soft)',
          border: '1px solid var(--color-border)',
        }}
      >
        No hay horarios disponibles ese día. Prueba otra fecha.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {slots.map((slotValue) => {
        const selected = slotValue === selectedSlot;
        return (
          <button
            key={slotValue}
            type="button"
            onClick={() => onSelect(slotValue)}
            className="rounded-xl px-4 py-3 text-center"
            style={{
              fontSize: '14px',
              fontWeight: selected ? 600 : 500,
              color: selected
                ? 'var(--color-text-brand)'
                : 'var(--color-text-primary)',
              backgroundColor: selected ? 'var(--color-brand-surface)' : 'var(--color-surface)',
              border: `1px solid ${
                selected ? 'var(--color-text-brand)' : 'var(--color-border)'
              }`,
              cursor: 'pointer',
            }}
          >
            {new Date(slotValue).toLocaleTimeString('es-CO', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
          </button>
        );
      })}
    </div>
  );
}

function DetailsStep({
  register,
  errors,
  remember,
  onRememberChange,
}: {
  register: ReturnType<typeof useForm<CustomerInfoInput>>['register'];
  errors: ReturnType<typeof useForm<CustomerInfoInput>>['formState']['errors'];
  remember: boolean;
  onRememberChange: (value: boolean) => void;
}) {
  return (
    <div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '22px',
          color: 'var(--color-text-primary)',
        }}
      >
        Tus datos
      </h3>
      <p
        className="mt-1"
        style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}
      >
        Usaremos esta información para gestionar y confirmar tu cita
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <TextField
          id="customerPhone"
          label="Celular"
          type="tel"
          required
          placeholder="Ej: +57 300 000 0000"
          error={errors.customerPhone?.message}
          registration={register('customerPhone')}
        />
        <TextField
          id="customerName"
          label="Nombre completo"
          type="text"
          required
          placeholder="Ej: Andrés Zapata"
          error={errors.customerName?.message}
          registration={register('customerName')}
        />
        <TextField
          id="customerEmail"
          label="Correo electrónico"
          type="email"
          required
          placeholder="Ej: andres@ejemplo.com"
          error={errors.customerEmail?.message}
          registration={register('customerEmail')}
        />
        <div>
          <label
            htmlFor="customerNote"
            className="mb-1.5 block"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            Observaciones o comentarios adicionales
          </label>
          <textarea
            id="customerNote"
            rows={3}
            {...register('customerNote')}
            placeholder="¿Hay algo que el profesional deba saber?"
            className="w-full rounded-lg px-3 py-2.5"
            style={{
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface)',
              border: `1px solid ${
                errors.customerNote ? 'var(--color-danger)' : 'var(--color-border)'
              }`,
              resize: 'vertical',
            }}
          />
          {errors.customerNote && (
            <p
              className="mt-1.5"
              style={{ fontSize: '13px', color: 'var(--color-danger)' }}
            >
              {errors.customerNote.message}
            </p>
          )}
        </div>
      </div>

      <div
        className="mt-5 rounded-2xl p-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: 'var(--color-surface-soft)',
              color: 'var(--color-text-brand)',
            }}
          >
            <ShieldIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '15px',
                color: 'var(--color-text-primary)',
              }}
            >
              Guardar mis datos
            </p>
            <p
              className="mt-0.5"
              style={{
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
              }}
            >
              Te ahorraremos tiempo en futuras reservas.
            </p>
          </div>
        </div>
        <div
          className="mt-3 flex items-center justify-between gap-3 pt-3"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <label
            htmlFor="remember-me"
            style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}
          >
            Recuerda mis datos
          </label>
          <Toggle
            id="remember-me"
            checked={remember}
            onChange={() => onRememberChange(!remember)}
            aria-label="Recuerda mis datos"
          />
        </div>
      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  type,
  error,
  registration,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  type: string;
  error?: string;
  registration: ReturnType<
    ReturnType<typeof useForm<CustomerInfoInput>>['register']
  >;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block"
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        {...registration}
        className="w-full rounded-lg px-3 py-2.5"
        style={{
          fontSize: '14px',
          color: 'var(--color-text-primary)',
          backgroundColor: 'var(--color-surface)',
          border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
        }}
      />
      {error && (
        <p className="mt-1.5" style={{ fontSize: '13px', color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function ConfirmStep({
  serviceName,
  modalityLabel,
  dateLabel,
  timeRange,
  durationMinutes,
  priceCents,
  address,
  customer,
  error,
  onEdit,
}: {
  serviceName: string;
  modalityLabel: string;
  dateLabel: string;
  timeRange: string;
  durationMinutes: number;
  priceCents: number;
  address: string | null;
  customer: Partial<CustomerInfoInput>;
  error: unknown;
  onEdit: (step: StepId) => void;
}) {
  const rows: {
    label: string;
    value: string;
    step: StepId;
    multiline?: boolean;
  }[] = [
    { label: 'SERVICIO', value: serviceName, step: 'service' },
    { label: 'MODALIDAD', value: modalityLabel, step: 'modality' },
  ];
  if (address) {
    rows.push({ label: 'DIRECCIÓN', value: address, step: 'modality' });
  }
  rows.push(
    { label: 'FECHA', value: dateLabel, step: 'datetime' },
    { label: 'HORA', value: timeRange, step: 'datetime' },
    {
      label: 'DURACIÓN',
      value: formatDuration(durationMinutes),
      step: 'service',
    },
    { label: 'PRECIO', value: formatCOP(priceCents), step: 'service' },
    { label: 'NOMBRE', value: customer.customerName || '—', step: 'details' },
    { label: 'CORREO', value: customer.customerEmail || '—', step: 'details' },
    {
      label: 'TELÉFONO',
      value: customer.customerPhone || '—',
      step: 'details',
    },
  );
  if (customer.customerNote?.trim()) {
    rows.push({
      label: 'OBSERVACIONES',
      value: customer.customerNote.trim(),
      step: 'details',
      multiline: true,
    });
  }

  return (
    <div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '22px',
          color: 'var(--color-text-primary)',
        }}
      >
        Revisa tu cita
      </h3>
      <p
        className="mt-1"
        style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}
      >
        Verifica que toda la información sea correcta antes de confirmar
      </p>
      <dl
        className="mt-4 overflow-hidden rounded-2xl"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {rows.map(({ label, value, step, multiline }, index) => (
          <div
            key={label}
            className="flex items-start justify-between gap-4 px-4 py-3.5"
            style={{
              borderTop: index === 0 ? 'none' : '1px solid var(--color-border)',
            }}
          >
            <div className="min-w-0">
              <dt
                className="agendia-label"
                style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}
              >
                {label}
              </dt>
              <dd
                className={`agendya-longtext mt-0.5${
                  multiline ? ' agendya-longtext--multiline' : ''
                }`}
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}
              >
                {value}
              </dd>
            </div>
            <button
              type="button"
              aria-label={`Editar ${label.toLowerCase()}`}
              onClick={() => onEdit(step)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{
                color: 'var(--color-text-brand)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <PencilIcon />
            </button>
          </div>
        ))}
      </dl>
      {error != null && (
        <div
          role="alert"
          className="mt-4 rounded-xl px-4 py-3"
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#B91C1C',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
          }}
        >
          {getApiErrorMessage(error)}
        </div>
      )}
    </div>
  );
}

function Summary({
  serviceName,
  modalityLabel,
  slotLabel,
  customerName,
  ctaLabel,
  ctaDisabled,
  onCta,
  ctaRef,
}: {
  serviceName: string | null;
  modalityLabel: string | null;
  slotLabel: string | null;
  customerName: string | null;
  ctaLabel: string;
  ctaDisabled: boolean;
  onCta: () => void;
  /** Set by the wizard so the mobile sticky CTA can observe this button. */
  ctaRef?: React.Ref<HTMLButtonElement>;
}) {
  const rows: [string, string, boolean][] = [
    ['SERVICIO', serviceName ?? 'No seleccionado', serviceName != null],
    ['MODALIDAD', modalityLabel ?? 'No seleccionado', modalityLabel != null],
    ['FECHA Y HORA', slotLabel ?? 'No seleccionado', slotLabel != null],
    ['TUS DATOS', customerName ?? 'Completar en paso 4', customerName != null],
  ];

  return (
    <div
      className="rounded-2xl p-6 lg:sticky lg:top-6"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '20px',
          color: 'var(--color-text-primary)',
        }}
      >
        Tu reserva
      </h3>
      <dl className="mt-4">
        {rows.map(([label, value, filled], index) => (
          <div
            key={label}
            className="py-4"
            style={{
              borderTop: index === 0 ? 'none' : '1px solid var(--color-border)',
            }}
          >
            <dt
              className="agendia-label"
              style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}
            >
              {label}
            </dt>
            <dd
              className="mt-1"
              style={{
                fontSize: '14px',
                fontWeight: filled ? 600 : 400,
                fontStyle: filled ? 'normal' : 'italic',
                color: filled
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-muted)',
              }}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <button
        ref={ctaRef}
        type="button"
        onClick={onCta}
        disabled={ctaDisabled}
        className="mt-4 w-full rounded-xl px-6 py-3.5 font-semibold"
        style={{
          backgroundColor: ctaDisabled
            ? 'var(--color-surface-soft)'
            : 'var(--color-brand-primary)',
          color: ctaDisabled ? 'var(--color-text-muted)' : '#fff',
          border: ctaDisabled ? '1px solid var(--color-border)' : 'none',
          fontSize: '15px',
          cursor: ctaDisabled ? 'not-allowed' : 'pointer',
          boxShadow: ctaDisabled
            ? 'none'
            : '0 8px 18px -8px rgba(79,70,229,0.55)',
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
      <path d="M4 9a2.5 2.5 0 0 0 4 0 2.5 2.5 0 0 0 4 0 2.5 2.5 0 0 0 4 0 2.5 2.5 0 0 0 4 0" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}
