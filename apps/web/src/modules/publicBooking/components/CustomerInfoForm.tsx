import { zodResolver } from '@hookform/resolvers/zod';
import { createBookingSchema } from '@ronda/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getApiErrorMessage } from '../../../shared/api/getApiErrorMessage';

const customerInfoSchema = createBookingSchema.pick({
  customerName: true,
  customerEmail: true,
  customerPhone: true,
});

type CustomerInfoInput = z.infer<typeof customerInfoSchema>;

interface CustomerInfoFormProps {
  onSubmit: (data: CustomerInfoInput) => void;
  isSubmitting: boolean;
  error: unknown;
}

export function CustomerInfoForm({
  onSubmit,
  isSubmitting,
  error,
}: CustomerInfoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerInfoInput>({ resolver: zodResolver(customerInfoSchema) });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <h2 className="text-lg font-semibold">3. Tus datos</h2>
      <div>
        <label
          htmlFor="customerName"
          className="mb-1 block text-sm font-medium"
        >
          Nombre
        </label>
        <input
          id="customerName"
          type="text"
          className="w-full rounded border border-gray-300 px-3 py-2"
          {...register('customerName')}
        />
        {errors.customerName && (
          <p className="mt-1 text-sm text-red-600">
            {errors.customerName.message}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="customerEmail"
          className="mb-1 block text-sm font-medium"
        >
          Correo
        </label>
        <input
          id="customerEmail"
          type="email"
          className="w-full rounded border border-gray-300 px-3 py-2"
          {...register('customerEmail')}
        />
        {errors.customerEmail && (
          <p className="mt-1 text-sm text-red-600">
            {errors.customerEmail.message}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="customerPhone"
          className="mb-1 block text-sm font-medium"
        >
          Teléfono
        </label>
        <input
          id="customerPhone"
          type="tel"
          className="w-full rounded border border-gray-300 px-3 py-2"
          {...register('customerPhone')}
        />
        {errors.customerPhone && (
          <p className="mt-1 text-sm text-red-600">
            {errors.customerPhone.message}
          </p>
        )}
      </div>
      {error != null && (
        <p className="text-sm text-red-600">{getApiErrorMessage(error)}</p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {isSubmitting ? 'Reservando…' : 'Confirmar reserva'}
      </button>
    </form>
  );
}
