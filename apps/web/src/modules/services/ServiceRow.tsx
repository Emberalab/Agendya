import { zodResolver } from '@hookform/resolvers/zod';
import {
  updateServiceSchema,
  type Service,
  type UpdateServiceInput,
} from '@agendya/types';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { Card, CardContent } from '../../shared/components/Card';
import { Input } from '../../shared/components/Input';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { useDeleteService } from './hooks/useDeleteService';
import { useUpdateService } from './hooks/useUpdateService';

export function ServiceRow({ service }: { service: Service }) {
  const [isEditing, setIsEditing] = useState(false);
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateServiceInput>({
    resolver: zodResolver(updateServiceSchema),
    defaultValues: {
      name: service.name,
      durationMinutes: service.durationMinutes,
    },
  });

  const onSubmit = handleSubmit((data) => {
    updateService.mutate(
      { id: service.id, input: data },
      {
        onSuccess: () => setIsEditing(false),
      },
    );
  });

  const handleCancel = () => {
    reset({ name: service.name, durationMinutes: service.durationMinutes });
    setIsEditing(false);
  };

  const handleReactivate = () => {
    updateService.mutate({ id: service.id, input: { isActive: true } });
  };

  if (isEditing) {
    return (
      <Card>
        <CardContent className="py-4">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                type="text"
                label="Nombre del servicio"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                type="number"
                label="Duración (minutos)"
                error={errors.durationMinutes?.message}
                {...register('durationMinutes', { valueAsNumber: true })}
              />
            </div>

            {updateService.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-2">
                <p className="text-sm text-red-600">
                  {getApiErrorMessage(updateService.error)}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={updateService.isPending}
                size="sm"
              >
                Guardar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card hover className={service.isActive ? '' : 'opacity-60'}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <p className="font-medium text-gray-900">{service.name}</p>
              {!service.isActive && (
                <Badge variant="secondary" size="sm">Inactivo</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">{service.durationMinutes} minutos</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Editar
            </Button>
            {service.isActive ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => deleteService.mutate(service.id)}
                disabled={deleteService.isPending}
              >
                Eliminar
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReactivate}
                disabled={updateService.isPending}
              >
                Reactivar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
