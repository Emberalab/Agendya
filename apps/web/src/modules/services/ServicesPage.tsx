import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PLAN_SERVICE_LIMITS, type Service } from '@agendya/types';
import { useFocusTrap } from '../../shared/a11y/useFocusTrap';
import { getApiErrorMessage } from '../../shared/api/getApiErrorMessage';
import { useProfile } from '../professionals/hooks/useProfile';
import { PlanLimitDialog } from './components/PlanLimitDialog';
import { ServiceRowMenu } from './components/ServiceRowMenu';
import { Toggle } from './components/Toggle';
import { formatCOP, formatDuration } from './format';
import { useDeleteService } from './hooks/useDeleteService';
import { useDuplicateService } from './hooks/useDuplicateService';
import { useServices } from './hooks/useServices';
import { useUpdateService } from './hooks/useUpdateService';

const ClockIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
  >
    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M7 4v3.2l2 2"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

const PriceIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
  >
    <rect
      x="1"
      y="3"
      width="12"
      height="8"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path d="M1 6h12" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

function HomeServicePill({ service }: { service: Service }) {
  if (!service.homeServiceEnabled) return null;
  const parts = ['A domicilio'];
  if (service.homeDurationMinutes != null)
    parts.push(formatDuration(service.homeDurationMinutes));
  if (service.homePriceCents != null)
    parts.push(formatCOP(service.homePriceCents));
  return (
    <span
      className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md"
      style={{
        backgroundColor: 'var(--color-brand-surface)',
        color: 'var(--color-text-brand)',
        fontFamily: 'var(--font-body)',
        fontSize: '11px',
        fontWeight: 600,
      }}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path
          d="M2 6l4-4 4 4M3 5.5V10h6V5.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {parts.join(' · ')}
    </span>
  );
}

function RowActions({
  service,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  service: Service;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        onClick={onEdit}
        className="flex items-center justify-center w-8 h-8 rounded-lg"
        style={{
          border: '1px solid var(--color-border)',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
        }}
        aria-label={`Editar ${service.name}`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M9.5 2.5l2 2L5 11l-2.5.5L3 9l6.5-6.5z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        ref={triggerRef}
        onClick={() => setMenuOpen((o) => !o)}
        className="flex items-center justify-center w-8 h-8 rounded-lg"
        style={{
          border: '1px solid var(--color-border)',
          background: menuOpen ? 'var(--color-surface-soft)' : 'none',
          cursor: 'pointer',
          color: 'var(--color-text-secondary)',
        }}
        aria-haspopup="true"
        aria-expanded={menuOpen}
        aria-label={`Más acciones para ${service.name}`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="2.5" r="1" fill="currentColor" />
          <circle cx="7" cy="7" r="1" fill="currentColor" />
          <circle cx="7" cy="11.5" r="1" fill="currentColor" />
        </svg>
      </button>
      {menuOpen && (
        <ServiceRowMenu
          anchorRef={triggerRef}
          onClose={() => setMenuOpen(false)}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

function ConfirmDeleteDialog({
  service,
  pending,
  onConfirm,
  onCancel,
}: {
  service: Service;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(true, onCancel);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--overlay-scrim)' }}
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Eliminar servicio"
        className="w-full max-w-[400px] rounded-3xl p-7 flex flex-col items-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          boxShadow: '0 24px 64px rgba(15,23,42,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: 'var(--color-danger-surface)' }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M4 6h14M8 6V4h6v2M6 6l1 12h8l1-12"
              stroke="#EF4444"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2
          className="text-center"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '19px',
            color: 'var(--color-text-primary)',
          }}
        >
          ¿Eliminar este servicio?
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
          <strong style={{ color: 'var(--color-text-primary)' }}>
            {service.name}
          </strong>{' '}
          dejará de estar disponible en tu catálogo. Las citas ya agendadas no
          se ven afectadas.
        </p>
        <div className="flex gap-3 w-full mt-6">
          <button
            onClick={onCancel}
            disabled={pending}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              background: 'none',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              cursor: pending ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--color-danger-fill)',
              color: '#fff',
              border: 'none',
              cursor: pending ? 'not-allowed' : 'pointer',
            }}
          >
            {pending ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ServicesPage() {
  const navigate = useNavigate();
  const {
    data: services,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useServices();
  const { data: profile } = useProfile();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const duplicateService = useDuplicateService();

  const [limitOpen, setLimitOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const plan = profile?.plan ?? 'FREE';
  const limit = PLAN_SERVICE_LIMITS[plan];
  const used = services?.length ?? 0;
  const atLimit = limit != null && used >= limit;

  const mutationError =
    updateService.error || deleteService.error || duplicateService.error;

  const handleCreate = () => {
    if (atLimit) setLimitOpen(true);
    else navigate('/dashboard/services/new');
  };

  const handleDuplicate = (service: Service) => {
    if (atLimit) {
      setLimitOpen(true);
      return;
    }
    duplicateService.mutate(service.id);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteService.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-[24px] lg:text-[28px]"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              marginBottom: '4px',
            }}
          >
            Servicios
          </h1>
          <p
            className="text-[13px] lg:text-sm"
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Gestiona los servicios que ofreces a tus clientes.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{
            fontFamily: 'var(--font-body)',
            backgroundColor: 'var(--color-brand-primary)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 2v10M2 7h10"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          Crear servicio
        </button>
      </div>

      {mutationError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 p-3 mb-4">
          <p
            className="text-sm text-red-600 dark:text-red-400"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {getApiErrorMessage(mutationError)}
          </p>
        </div>
      )}

      {isLoading && (
        <div
          className="rounded-2xl flex items-center justify-center py-16"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: 'var(--color-text-muted)',
            }}
          >
            Cargando servicios…
          </p>
        </div>
      )}

      {!isLoading && isError && (
        <div
          className="rounded-2xl flex flex-col items-center py-16 px-6"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              marginBottom: '4px',
            }}
          >
            No pudimos cargar tus servicios
          </p>
          <p
            className="text-center"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              marginBottom: '16px',
            }}
          >
            Revisa tu conexión e inténtalo de nuevo.
          </p>
          <button
            onClick={() => void refetch()}
            disabled={isRefetching}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              fontFamily: 'var(--font-body)',
              border: '1px solid var(--color-border)',
              background: 'none',
              color: 'var(--color-text-primary)',
              cursor: isRefetching ? 'not-allowed' : 'pointer',
            }}
          >
            {isRefetching ? 'Reintentando…' : 'Reintentar'}
          </button>
        </div>
      )}

      {!isLoading && !isError && used === 0 && (
        <>
          <div
            className="rounded-2xl flex flex-col items-center py-16 px-6"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{
                border: '2px dashed var(--color-brand-border)',
                backgroundColor: '#F5F3FF',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="7"
                  width="18"
                  height="13"
                  rx="2"
                  stroke="#6366F1"
                  strokeWidth="1.7"
                />
                <path
                  d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"
                  stroke="#6366F1"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '18px',
                color: 'var(--color-text-primary)',
                marginBottom: '6px',
              }}
            >
              Aún no has creado ningún servicio
            </h2>
            <p
              className="text-center max-w-md"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                lineHeight: '1.55',
                marginBottom: '18px',
              }}
            >
              Crea y organiza los servicios que ofreces para que tus clientes
              puedan agendarlos fácilmente.
            </p>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
              style={{
                fontFamily: 'var(--font-body)',
                backgroundColor: 'var(--color-brand-primary)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 2v10M2 7h10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              Crear servicio
            </button>
          </div>
          <p
            className="mt-3 px-1"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              color: 'var(--color-text-muted)',
            }}
          >
            Modificado por última vez hoy
          </p>
        </>
      )}

      {!isLoading && services && used > 0 && (
        <>
          {/* Desktop table */}
          <div
            className="hidden lg:block rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              className="grid items-center px-5 py-3"
              style={{
                gridTemplateColumns: '1fr 140px 140px 90px 110px',
                backgroundColor: 'var(--color-surface-soft)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {['Servicio', 'Duración', 'Precio', 'Estado', 'Acciones'].map(
                (h) => (
                  <span
                    key={h}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      color: 'var(--color-text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </span>
                ),
              )}
            </div>

            {services.map((service, i) => (
              <div
                key={service.id}
                className="grid items-center px-5 py-4"
                style={{
                  gridTemplateColumns: '1fr 140px 140px 90px 110px',
                  borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                  opacity: service.isActive ? 1 : 0.6,
                }}
              >
                <div className="min-w-0 pr-4">
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
                  <HomeServicePill service={service} />
                </div>

                <span
                  className="flex items-center gap-1.5"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <ClockIcon />
                  {formatDuration(service.durationMinutes)}
                </span>

                <span
                  className="flex items-center gap-1.5"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <PriceIcon />
                  {formatCOP(service.priceCents)}
                </span>

                <span>
                  <Toggle
                    checked={service.isActive}
                    aria-label={`Estado de ${service.name}`}
                    onChange={() =>
                      updateService.mutate({
                        id: service.id,
                        input: { isActive: !service.isActive },
                      })
                    }
                  />
                </span>

                <RowActions
                  service={service}
                  onEdit={() =>
                    navigate(`/dashboard/services/${service.id}/edit`)
                  }
                  onDuplicate={() => handleDuplicate(service)}
                  onDelete={() => setDeleteTarget(service)}
                />
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="flex lg:hidden flex-col gap-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  opacity: service.isActive ? 1 : 0.6,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '15px',
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
                  <Toggle
                    checked={service.isActive}
                    aria-label={`Estado de ${service.name}`}
                    onChange={() =>
                      updateService.mutate({
                        id: service.id,
                        input: { isActive: !service.isActive },
                      })
                    }
                  />
                </div>

                <div className="flex items-center gap-4 mt-2.5">
                  <span
                    className="flex items-center gap-1.5"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <ClockIcon />
                    {formatDuration(service.durationMinutes)}
                  </span>
                  <span
                    className="flex items-center gap-1.5"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <PriceIcon />
                    {formatCOP(service.priceCents)}
                  </span>
                </div>
                <HomeServicePill service={service} />

                <div
                  className="flex items-center gap-2 mt-3 pt-3"
                  style={{ borderTop: '1px solid var(--color-border)' }}
                >
                  <button
                    onClick={() =>
                      navigate(`/dashboard/services/${service.id}/edit`)
                    }
                    className="flex-1 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      fontFamily: 'var(--font-body)',
                      border: '1px solid var(--color-border)',
                      background: 'none',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDuplicate(service)}
                    className="py-2 px-3 rounded-lg text-sm font-semibold"
                    style={{
                      fontFamily: 'var(--font-body)',
                      border: '1px solid var(--color-border)',
                      background: 'none',
                      color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    Duplicar
                  </button>
                  <button
                    onClick={() => setDeleteTarget(service)}
                    className="py-2 px-3 rounded-lg text-sm font-semibold"
                    style={{
                      fontFamily: 'var(--font-body)',
                      border: '1px solid var(--color-danger-border)',
                      background: 'none',
                      color: 'var(--color-danger)',
                      cursor: 'pointer',
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p
            className="mt-3 px-1"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              color: 'var(--color-text-muted)',
            }}
          >
            Se muestran {used} {used === 1 ? 'servicio' : 'servicios'} de tu
            catálogo actual.
          </p>
        </>
      )}

      {limitOpen && (
        <PlanLimitDialog
          plan={plan}
          used={used}
          onClose={() => setLimitOpen(false)}
          onSeePlans={() => {
            setLimitOpen(false);
            navigate('/dashboard/profile');
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          service={deleteTarget}
          pending={deleteService.isPending}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
