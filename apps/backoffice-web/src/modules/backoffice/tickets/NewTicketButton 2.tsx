import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { TicketCategory, TicketPriority, TicketProfessionalSummary } from '@agendya/types';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '@agendya/types';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import { Textarea } from '../../../shared/components/Textarea';
import { searchBackoffice } from '../dashboard/api';
import { useCreateTicket } from './hooks/useTicketMutations';
import { TICKET_CATEGORY_LABELS } from '../shared/categoryLabels';
import { TICKET_PRIORITY_LABELS } from '../shared/badges';

export function NewTicketButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Nuevo ticket
      </Button>
      {open && <NewTicketModal onClose={() => setOpen(false)} />}
    </>
  );
}

function NewTicketModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const createTicket = useCreateTicket();

  const [professionalQuery, setProfessionalQuery] = useState('');
  const [professional, setProfessional] = useState<TicketProfessionalSummary | null>(null);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('OTHER');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');
  const [body, setBody] = useState('');

  const { data: searchResults } = useQuery({
    queryKey: ['backoffice', 'search', professionalQuery],
    queryFn: () => searchBackoffice(professionalQuery),
    enabled: !professional && professionalQuery.trim().length >= 2,
  });

  const canSubmit = !!professional && subject.trim().length >= 3 && body.trim().length > 0;

  const onSubmit = async () => {
    if (!professional) return;
    const ticket = await createTicket.mutateAsync({
      professionalId: professional.id,
      subject: subject.trim(),
      category,
      priority,
      body: body.trim(),
      visibility: 'INTERNAL_NOTE',
    });
    onClose();
    navigate(`/backoffice/tickets/${ticket.id}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay-scrim)] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-ticket-title"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-menu">
        <h2 id="new-ticket-title" className="text-lg font-bold text-text-primary">
          Nuevo ticket
        </h2>

        <div className="mt-4 flex flex-col gap-3">
          {professional ? (
            <div className="flex items-center justify-between rounded-control px-3 py-2 text-sm shadow-[inset_0_0_0_1px_var(--color-border)]">
              <span>{professional.businessName}</span>
              <button type="button" className="text-xs text-text-muted hover:underline" onClick={() => setProfessional(null)}>
                Cambiar
              </button>
            </div>
          ) : (
            <div>
              <Input
                label="Profesional"
                placeholder="Buscar por nombre o correo…"
                value={professionalQuery}
                onChange={(event) => setProfessionalQuery(event.target.value)}
              />
              {searchResults && searchResults.professionals.length > 0 && (
                <ul className="mt-1 max-h-40 overflow-y-auto rounded-control shadow-[inset_0_0_0_1px_var(--color-border)]">
                  {searchResults.professionals.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-soft"
                        onClick={() => {
                          setProfessional(p);
                          setProfessionalQuery('');
                        }}
                      >
                        {p.businessName} — {p.email}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <Input label="Asunto" value={subject} onChange={(event) => setSubject(event.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Categoría" value={category} onChange={(event) => setCategory(event.target.value as TicketCategory)}>
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {TICKET_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
            <Select label="Prioridad" value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)}>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {TICKET_PRIORITY_LABELS[p]}
                </option>
              ))}
            </Select>
          </div>

          <Textarea label="Descripción (nota interna)" rows={3} value={body} onChange={(event) => setBody(event.target.value)} />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" disabled={!canSubmit || createTicket.isPending} onClick={onSubmit}>
            {createTicket.isPending ? 'Creando…' : 'Crear ticket'}
          </Button>
        </div>
      </div>
    </div>
  );
}
