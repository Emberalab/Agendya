import { zodResolver } from '@hookform/resolvers/zod';
import {
  updateServiceSchema,
  type Service,
  type UpdateServiceInput,
} from '@ronda/types';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
      <li className="flex flex-col gap-2 border-b border-gray-200 py-3">
        <form onSubmit={onSubmit} className="flex flex-wrap items-start gap-2">
          <div>
            <input
              type="text"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              {...register('name')}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>
          <div>
            <input
              type="number"
              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
              {...register('durationMinutes', { valueAsNumber: true })}
            />
            {errors.durationMinutes && (
              <p className="mt-1 text-xs text-red-600">
                {errors.durationMinutes.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={updateService.isPending}
            className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded border border-gray-300 px-3 py-1 text-sm"
          >
            Cancelar
          </button>
        </form>
        {updateService.isError && (
          <p className="text-xs text-red-600">
            {getApiErrorMessage(updateService.error)}
          </p>
        )}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 border-b border-gray-200 py-3">
      <div className={service.isActive ? '' : 'opacity-50'}>
        <p className="text-sm font-medium">{service.name}</p>
        <p className="text-xs text-gray-500">{service.durationMinutes} min</p>
      </div>
      <div className="flex items-center gap-2">
        {!service.isActive && (
          <span className="text-xs text-gray-500">Inactivo</span>
        )}
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded border border-gray-300 px-2 py-1 text-xs"
        >
          Editar
        </button>
        {service.isActive ? (
          <button
            type="button"
            onClick={() => deleteService.mutate(service.id)}
            disabled={deleteService.isPending}
            className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
          >
            Eliminar
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReactivate}
            disabled={updateService.isPending}
            className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
          >
            Reactivar
          </button>
        )}
      </div>
    </li>
  );
}
