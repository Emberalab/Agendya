import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  TICKET_CATEGORIES,
  createSupportTicketSchema,
  type CreateSupportTicketInput,
} from '@agendya/types';
import { FormGroup, Input, Select, Textarea } from '@moondesignsystem/react';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { TICKET_CATEGORY_LABELS } from './labels';
import { useCreateMyTicket } from './hooks/useSupportMutations';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mt-1.5 text-sm text-red-600 dark:text-red-400"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {message}
    </p>
  );
}

export function NewSupportTicketPage() {
  const navigate = useNavigate();
  const createTicket = useCreateMyTicket();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSupportTicketInput>({
    resolver: zodResolver(createSupportTicketSchema),
    defaultValues: { subject: '', category: 'OTHER', body: '' },
  });

  const onSubmit = handleSubmit((values) => {
    createTicket.mutate(values, {
      onSuccess: (ticket) => navigate(`/dashboard/support/${ticket.id}`),
    });
  });

  return (
    <div style={{ fontFamily: 'var(--font-body)' }} className="w-full max-w-2xl">
      <h1
        className="text-[24px] lg:text-[28px]"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: '4px',
        }}
      >
        Nuevo ticket de soporte
      </h1>
      <p
        className="text-[13px] lg:text-sm mb-6"
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-secondary)',
        }}
      >
        Cuéntanos qué necesitas. Nuestro equipo te responderá aquí mismo.
      </p>

      <form onSubmit={onSubmit}>
        <div
          className="rounded-2xl p-6 lg:p-8 flex flex-col gap-6"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <FormGroup>
            <FormGroup.Label htmlFor="subject" className="agendia-label">
              Asunto *
            </FormGroup.Label>
            <Input
              id="subject"
              placeholder="Ej: No me llegó la notificación de una cita"
              error={!!errors.subject}
              {...register('subject')}
            />
            <FieldError message={errors.subject?.message} />
          </FormGroup>

          <FormGroup>
            <FormGroup.Label htmlFor="category" className="agendia-label">
              Categoría *
            </FormGroup.Label>
            <Select id="category" error={!!errors.category} {...register('category')}>
              {TICKET_CATEGORIES.map((category) => (
                <Select.Option key={category} value={category}>
                  {TICKET_CATEGORY_LABELS[category]}
                </Select.Option>
              ))}
            </Select>
            <FieldError message={errors.category?.message} />
          </FormGroup>

          <FormGroup>
            <FormGroup.Label htmlFor="body" className="agendia-label">
              Describe tu problema *
            </FormGroup.Label>
            <Textarea
              id="body"
              rows={6}
              placeholder="Entre más detalle nos des, más rápido podremos ayudarte."
              error={!!errors.body}
              {...register('body')}
            />
            <FieldError message={errors.body?.message} />
          </FormGroup>
        </div>

        {createTicket.isError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 p-3 mt-4"
          >
            <p
              className="text-sm text-red-600 dark:text-red-400"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {getApiErrorMessage(createTicket.error)}
            </p>
          </div>
        )}

        <div
          className="rounded-2xl p-5 mt-5 flex items-center justify-end gap-3"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/dashboard/support')}
            disabled={createTicket.isPending}
            className="px-6 py-3 rounded-xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              background: 'none',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              cursor: createTicket.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createTicket.isPending}
            className="px-6 py-3 rounded-xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--color-brand-primary)',
              color: '#fff',
              border: 'none',
              cursor: createTicket.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {createTicket.isPending ? 'Enviando…' : 'Enviar ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
