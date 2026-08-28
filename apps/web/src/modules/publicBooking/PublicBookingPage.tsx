import type { PublicBooking } from '@agendya/types';
import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '../../shared/components/Card';
import { Input } from '../../shared/components/Input';
import { BookingConfirmation } from './components/BookingConfirmation';
import { CustomerInfoForm } from './components/CustomerInfoForm';
import { ServiceSelector } from './components/ServiceSelector';
import { SlotGrid } from './components/SlotGrid';
import { useAvailability } from './hooks/useAvailability';
import { useCreateBooking } from './hooks/useCreateBooking';
import { usePublicProfessional } from './hooks/usePublicProfessional';

export function PublicBookingPage() {
  const { slug = '' } = useParams();
  const {
    data: professional,
    isLoading,
    isError,
  } = usePublicProfessional(slug);

  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] =
    useState<PublicBooking | null>(null);

  // Ref para scroll automático al formulario
  const customerFormRef = useRef<HTMLDivElement>(null);

  // Obtener availability con todos los servicios seleccionados
  const availability = useAvailability(slug, serviceIds, date);
  const createBooking = useCreateBooking(slug);

  const handleToggleService = (serviceId: string) => {
    setServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
    setSlot(null); // Reset slot cuando cambian servicios
  };

  // Scroll automático cuando se selecciona un slot
  useEffect(() => {
    if (slot && customerFormRef.current) {
      setTimeout(() => {
        customerFormRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  }, [slot]);

  const today = new Date().toISOString().slice(0, 10);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">Cargando…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !professional) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600">No encontramos esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmedBooking) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <BookingConfirmation booking={confirmedBooking} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Header */}
      <div
        className="px-4 py-12 shadow-lg"
        style={{
          backgroundColor: professional.brandColor ?? '#1F2937',
        }}
      >
        <div className="mx-auto max-w-md text-center">
          {/* Avatar/Logo Circle */}
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl overflow-hidden">
            {professional.logoUrl ? (
              <img
                src={professional.logoUrl}
                alt={professional.businessName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-gray-900">
                {professional.businessName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <h1 className="mb-3 text-3xl font-bold text-gray-900">
            {professional.businessName}
          </h1>

          {professional.description && (
            <p className="text-gray-700">
              {professional.description}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Columna izquierda - Servicios */}
          <div>
            <ServiceSelector
              services={professional.services}
              selectedServiceIds={serviceIds}
              onToggle={handleToggleService}
            />
          </div>

          {/* Columna derecha - Fecha y hora */}
          <div>
            {serviceIds.length > 0 && (
              <div>
                <h2 className="mb-4 text-xl font-bold text-gray-900">
                  2. Elige fecha y hora
                </h2>
                <Card>
                  <CardContent className="py-5">
                    <Input
                      type="date"
                      min={today}
                      value={date}
                      onChange={(event) => {
                        setDate(event.target.value);
                        setSlot(null);
                      }}
                      label="Fecha"
                    />
                    {date && (
                      <div className="mt-5">
                        <p className="mb-3 text-sm font-medium text-gray-700">
                          Horarios disponibles
                        </p>
                        <SlotGrid
                          slots={availability.data ?? []}
                          isLoading={availability.isLoading}
                          selectedSlot={slot}
                          onSelect={setSlot}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Formulario de información del cliente - Ancho completo debajo */}
        {serviceIds.length > 0 && slot && (
          <div ref={customerFormRef} className="mt-6">
            <Card>
              <CardContent className="py-4">
                <CustomerInfoForm
                  isSubmitting={createBooking.isPending}
                  error={createBooking.error}
                  onSubmit={(data) => {
                    createBooking.mutate(
                      { serviceIds: serviceIds.join(','), startAt: slot, ...data },
                      { onSuccess: setConfirmedBooking },
                    );
                  }}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
