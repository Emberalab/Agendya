import type { PublicBooking } from '@ronda/types';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
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

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] =
    useState<PublicBooking | null>(null);

  const availability = useAvailability(slug, serviceId, date);
  const createBooking = useCreateBooking(slug);

  const today = new Date().toISOString().slice(0, 10);

  if (isLoading) {
    return <p className="p-6 text-center">Cargando…</p>;
  }

  if (isError || !professional) {
    return (
      <p className="p-6 text-center text-red-600">
        No encontramos esta página.
      </p>
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
    <div className="mx-auto max-w-md px-4 py-10">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">{professional.businessName}</h1>
        {professional.description && (
          <p className="mt-1 text-sm text-gray-500">
            {professional.description}
          </p>
        )}
      </header>

      <div className="flex flex-col gap-6">
        <ServiceSelector
          services={professional.services}
          selectedServiceId={serviceId}
          onSelect={(id) => {
            setServiceId(id);
            setSlot(null);
          }}
        />

        {serviceId && (
          <div>
            <h2 className="mb-2 text-lg font-semibold">
              2. Elige fecha y hora
            </h2>
            <input
              type="date"
              min={today}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSlot(null);
              }}
              className="mb-3 rounded border border-gray-300 px-3 py-2"
            />
            {date && (
              <SlotGrid
                slots={availability.data ?? []}
                isLoading={availability.isLoading}
                selectedSlot={slot}
                onSelect={setSlot}
              />
            )}
          </div>
        )}

        {serviceId && slot && (
          <CustomerInfoForm
            isSubmitting={createBooking.isPending}
            error={createBooking.error}
            onSubmit={(data) => {
              createBooking.mutate(
                { serviceId, startAt: slot, ...data },
                { onSuccess: setConfirmedBooking },
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
