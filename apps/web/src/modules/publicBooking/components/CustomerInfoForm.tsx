import { zodResolver } from '@hookform/resolvers/zod';
import { createBookingSchema } from '@agendya/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
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
      <h2 className="text-xl font-bold text-gray-900">3. Tus datos</h2>
      <Input
        id="customerName"
        type="text"
        label="Nombre"
        error={errors.customerName?.message}
        {...register('customerName')}
      />
      <Input
        id="customerEmail"
        type="email"
        label="Correo"
        error={errors.customerEmail?.message}
        {...register('customerEmail')}
      />
      <Input
        id="customerPhone"
        type="tel"
        label="Teléfono"
        error={errors.customerPhone?.message}
        {...register('customerPhone')}
      />
      {error != null && (
        <p className="text-sm text-red-600">{getApiErrorMessage(error)}</p>
      )}
      <Button
        type="submit"
        disabled={isSubmitting}
        variant="primary"
        fullWidth
      >
        {isSubmitting ? 'Reservando…' : 'Confirmar reserva'}
      </Button>
    </form>
  );
}
