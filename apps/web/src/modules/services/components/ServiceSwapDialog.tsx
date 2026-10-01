import { useState } from 'react';
import type { Service } from '@agendya/types';
import { useFocusTrap } from '../../../shared/a11y/useFocusTrap';

interface ServiceSwapDialogProps {
  targetService: Service;
  enabledServices: Service[];
  onConfirm: (targetId: string) => void;
  onCancel: () => void;
}

export function ServiceSwapDialog({
  targetService,
  enabledServices,
  onConfirm,
  onCancel,
}: ServiceSwapDialogProps) {
  const [selectedService, setSelectedService] = useState<string | null>(
    enabledServices[0]?.id ?? null,
  );

  const dialogRef = useFocusTrap<HTMLDivElement>(true, onCancel);

  const handleConfirm = () => {
    onConfirm(targetService.id);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="swap-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--overlay-scrim)' }}
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="swap-dialog-title"
          className="text-center"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '19px',
            color: 'var(--color-text-primary)',
          }}
        >
          Activar servicio
        </h2>
        <p
          className="text-center mt-1.5"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            lineHeight: '1.55',
          }}
        >
          Para activar{' '}
          <strong style={{ color: 'var(--color-text-primary)' }}>
            {targetService.name}
          </strong>
          , debes desactivar uno de tus servicios activos.
        </p>

        <div className="mt-5 space-y-2">
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            Desactivar servicio:
          </p>
          {enabledServices.map((service) => (
            <label
              key={service.id}
              className="flex items-start gap-3 p-3 rounded-lg cursor-pointer"
              style={{
                border: '1px solid var(--color-border)',
                backgroundColor:
                  selectedService === service.id
                    ? 'var(--color-brand-surface)'
                    : 'var(--color-surface)',
              }}
            >
              <input
                type="radio"
                name="service-swap"
                value={service.id}
                checked={selectedService === service.id}
                onChange={() => setSelectedService(service.id)}
                className="mt-0.5"
                style={{ accentColor: 'var(--color-brand-primary)' }}
              />
              <div className="flex-1 min-w-0">
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {service.name}
                </p>
                {service.description && (
                  <p
                    className="truncate"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    {service.description}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3 w-full mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              background: 'none',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedService}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              backgroundColor: selectedService
                ? 'var(--color-brand-primary)'
                : 'var(--color-border)',
              color: 'var(--color-text-on-brand)',
              border: 'none',
              cursor: selectedService ? 'pointer' : 'not-allowed',
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
