import { zodResolver } from '@hookform/resolvers/zod';
import { createServiceSchema, type CreateServiceInput } from '@ronda/types';
import { useForm } from 'react-hook-form';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { useCreateService } from './hooks/useCreateService';
import { useServices } from './hooks/useServices';
import { ServiceRow } from './ServiceRow';

export function ServicesPage() {
  const { data: services, isLoading } = useServices();
  const createService = useCreateService();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateServiceInput>({
    resolver: zodResolver(createServiceSchema),
  });

  const onSubmit = handleSubmit((data) => {
    createService.mutate(data, { onSuccess: () => reset() });
  });

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-2xl font-semibold">Tus servicios</h1>
      <p className="mb-6 text-sm text-gray-500">
        Define los servicios que ofreces y cuánto tiempo toma cada uno.
      </p>

      <form
        onSubmit={onSubmit}
        className="mb-6 flex flex-wrap items-start gap-2"
        noValidate
      >
        <div>
          <input
            type="text"
            placeholder="Nombre del servicio"
            className="rounded border border-gray-300 px-3 py-2"
            {...register('name')}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
        <div>
          <input
            type="number"
            placeholder="Duración (min)"
            className="w-36 rounded border border-gray-300 px-3 py-2"
            {...register('durationMinutes', { valueAsNumber: true })}
          />
          {errors.durationMinutes && (
            <p className="mt-1 text-sm text-red-600">
              {errors.durationMinutes.message}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={createService.isPending}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {createService.isPending ? 'Agregando…' : 'Agregar servicio'}
        </button>
      </form>
      {createService.isError && (
        <p className="mb-4 text-sm text-red-600">
          {getApiErrorMessage(createService.error)}
        </p>
      )}

      {isLoading && <p>Cargando servicios…</p>}
      {!isLoading && services?.length === 0 && (
        <p className="text-sm text-gray-500">
          Todavía no tienes servicios. Agrega el primero arriba.
        </p>
      )}
      {!isLoading && services && services.length > 0 && (
        <ul>
          {services.map((service) => (
            <ServiceRow key={service.id} service={service} />
          ))}
        </ul>
      )}
    </div>
  );
}
