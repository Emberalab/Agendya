import { zodResolver } from '@hookform/resolvers/zod';
import { createServiceSchema, type CreateServiceInput } from '@agendya/types';
import { useForm } from 'react-hook-form';
import { Button } from '../../shared/components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/components/Card';
import { Input } from '../../shared/components/Input';
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
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Tus servicios</h1>
        <p className="text-gray-600">
          Define los servicios que ofreces y cuánto tiempo toma cada uno.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Agregar nuevo servicio</CardTitle>
          <CardDescription>
            Crea un servicio con su nombre y duración.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={onSubmit}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                type="text"
                placeholder="Ej: Corte de cabello"
                label="Nombre del servicio"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                type="number"
                placeholder="Ej: 30"
                label="Duración (minutos)"
                error={errors.durationMinutes?.message}
                {...register('durationMinutes', { valueAsNumber: true })}
              />
            </div>

            {createService.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">
                  {getApiErrorMessage(createService.error)}
                </p>
              </div>
            )}

            <div>
              <Button
                type="submit"
                disabled={createService.isPending}
                className="w-full sm:w-auto"
              >
                {createService.isPending ? 'Agregando…' : 'Agregar servicio'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">Cargando servicios…</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && services?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              Todavía no tienes servicios. Agrega el primero arriba.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && services && services.length > 0 && (
        <div className="space-y-3">
          {services.map((service) => (
            <ServiceRow key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
