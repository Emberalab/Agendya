import type { PublicBooking } from '@agendya/types';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Logo from '../../imports/LogoGroup';
import { ThemeToggle } from '../../shared/theme/ThemeToggle';
import { BookingWizard } from './BookingWizard';
import type { BookingWizardInitialValues } from './BookingWizard';
import { BookingConfirmedView } from './components/BookingConfirmedView';
import { usePublicProfessional } from './hooks/usePublicProfessional';

function editValuesFromBooking(
  booking: PublicBooking,
): BookingWizardInitialValues {
  return {
    serviceId: booking.serviceId,
    atHome: booking.atHome,
    address: booking.customerAddress,
    startAtISO: booking.startAt,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    customerNote: booking.customerNote ?? '',
  };
}

export function PublicBookingPage() {
  const { slug = '' } = useParams();
  const {
    data: professional,
    isLoading,
    isError,
  } = usePublicProfessional(slug);

  const [confirmedBooking, setConfirmedBooking] =
    useState<PublicBooking | null>(null);
  const [editingBooking, setEditingBooking] = useState<PublicBooking | null>(
    null,
  );
  const [started, setStarted] = useState(false);
  const [preselectedServiceId, setPreselectedServiceId] = useState<
    string | null
  >(null);

  const startWizard = (serviceId?: string) => {
    setPreselectedServiceId(serviceId ?? null);
    setStarted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetToLanding = () => {
    setConfirmedBooking(null);
    setEditingBooking(null);
    setStarted(false);
    setPreselectedServiceId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-6xl px-4 lg:py-10">
          <div
            className="mx-auto mt-10 max-w-md rounded-2xl px-6 py-12 text-center"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
              Cargando…
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  if (isError || !professional) {
    return (
      <Shell>
        <div className="mx-auto w-full max-w-6xl px-4 lg:py-10">
          <div
            className="mx-auto mt-10 max-w-md rounded-2xl px-6 py-12 text-center"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p style={{ fontSize: '14px', color: 'var(--color-danger)' }}>
              No encontramos esta página.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  if (editingBooking) {
    return (
      <Shell>
        <BookingWizard
          slug={slug}
          professional={professional}
          mode="edit"
          editToken={editingBooking.cancellationToken}
          initialValues={editValuesFromBooking(editingBooking)}
          onConfirmed={(booking) => {
            setConfirmedBooking(booking);
            setEditingBooking(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onExit={() => {
            setEditingBooking(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </Shell>
    );
  }

  if (confirmedBooking) {
    return (
      <Shell>
        <BookingConfirmedView
          booking={confirmedBooking}
          onDone={resetToLanding}
          onEdit={() => {
            setEditingBooking(confirmedBooking);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </Shell>
    );
  }

  if (started) {
    return (
      <Shell>
        <BookingWizard
          slug={slug}
          professional={professional}
          initialServiceId={preselectedServiceId}
          onConfirmed={setConfirmedBooking}
          onExit={() => setStarted(false)}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto w-full max-w-6xl sm:px-4 lg:py-10">
        {/* Hero */}
        <section
          aria-label="Negocio"
          className="overflow-hidden sm:rounded-2xl"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="relative">
            {professional.coverImageUrl ? (
              <img
                src={professional.coverImageUrl}
                alt=""
                className="h-40 w-full object-cover sm:h-52"
              />
            ) : (
              <div
                className="h-40 w-full sm:h-52"
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

          <div className="relative z-10 px-6 pb-6 sm:pb-7">
            <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-4">
              <div
                className="-mt-12 flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-full sm:-mt-14"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '4px solid var(--color-surface)',
                  boxShadow: '0 8px 24px rgba(15,23,42,0.18)',
                }}
              >
                {professional.logoUrl ? (
                  <img
                    src={professional.logoUrl}
                    alt={professional.businessName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '34px',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {professional.businessName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="mt-3 min-w-0 text-center sm:mt-0 sm:pb-1 sm:text-left">
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                  <h1
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '24px',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {professional.businessName}
                  </h1>
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
          </div>
        </section>

        {/* CTA */}
        <div className="mt-5 px-6 sm:flex sm:justify-center sm:px-0">
          <button
            type="button"
            onClick={() => startWizard()}
            className="w-full rounded-2xl px-10 py-4 font-semibold sm:w-auto"
            style={{
              background:
                'linear-gradient(135deg, #6366F1 0%, var(--color-brand-primary) 100%)',
              color: '#fff',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              boxShadow:
                '0 16px 32px -10px rgba(79, 70, 229, 0.55), 0 6px 14px -8px rgba(79, 70, 229, 0.4)',
            }}
          >
            Reservar cita
          </button>
        </div>

        <footer
          className="py-8 text-center"
          style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}
        >
          Powered by{' '}
          <span
            style={{ color: 'var(--color-text-brand)', fontWeight: 600 }}
          >
            agendya
          </span>
        </footer>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--color-surface-soft)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <a href="#main-content" className="agendia-skip-link">
        Saltar al contenido principal
      </a>
      <header
        className="hidden items-center justify-between px-8 py-4 lg:flex"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="relative block h-7 w-7">
            <Logo />
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '18px',
              color: 'var(--color-text-brand)',
            }}
          >
            agendya
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Portal de Reservas Público
          </span>
          <ThemeToggle />
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
