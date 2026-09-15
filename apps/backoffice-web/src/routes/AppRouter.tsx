import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { PublicRoute } from './PublicRoute';
import { RequirePermission } from '../modules/backoffice/shared/RequirePermission';

const BackofficeLoginPage = lazy(() =>
  import('../modules/backoffice/auth/BackofficeLoginPage').then((m) => ({
    default: m.BackofficeLoginPage,
  })),
);
const BackofficeLayout = lazy(() =>
  import('../modules/backoffice/dashboard/BackofficeLayout').then((m) => ({
    default: m.BackofficeLayout,
  })),
);
const BackofficeDashboardPage = lazy(() =>
  import('../modules/backoffice/dashboard/BackofficeDashboardPage').then((m) => ({
    default: m.BackofficeDashboardPage,
  })),
);
const TicketsListPage = lazy(() =>
  import('../modules/backoffice/tickets/TicketsListPage').then((m) => ({
    default: m.TicketsListPage,
  })),
);
const TicketDetailPage = lazy(() =>
  import('../modules/backoffice/tickets/TicketDetailPage').then((m) => ({
    default: m.TicketDetailPage,
  })),
);
const ProfessionalSearchPage = lazy(() =>
  import('../modules/backoffice/professionals/ProfessionalSearchPage').then(
    (m) => ({ default: m.ProfessionalSearchPage }),
  ),
);
const Professional360Page = lazy(() =>
  import('../modules/backoffice/professionals/Professional360Page').then((m) => ({
    default: m.Professional360Page,
  })),
);
const AppointmentInvestigationPage = lazy(() =>
  import('../modules/backoffice/appointments/AppointmentInvestigationPage').then(
    (m) => ({ default: m.AppointmentInvestigationPage }),
  ),
);
const AuditLogPage = lazy(() =>
  import('../modules/backoffice/auditLog/AuditLogPage').then((m) => ({
    default: m.AuditLogPage,
  })),
);
const InternalUsersPage = lazy(() =>
  import('../modules/backoffice/internalUsers/InternalUsersPage').then((m) => ({
    default: m.InternalUsersPage,
  })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-text-muted">Cargando…</p>
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/backoffice/login" element={<BackofficeLoginPage />} />
          </Route>

          <Route element={<PrivateRoute />}>
            <Route element={<BackofficeLayout />}>
              <Route path="/backoffice" element={<BackofficeDashboardPage />} />
              <Route path="/backoffice/tickets" element={<TicketsListPage />} />
              <Route path="/backoffice/tickets/:id" element={<TicketDetailPage />} />
              <Route
                path="/backoffice/professionals"
                element={<ProfessionalSearchPage />}
              />
              <Route
                path="/backoffice/professionals/:id"
                element={<Professional360Page />}
              />
              <Route
                path="/backoffice/appointments/:id"
                element={<AppointmentInvestigationPage />}
              />
              <Route path="/backoffice/audit-log" element={<AuditLogPage />} />
              <Route
                path="/backoffice/internal-users"
                element={
                  <RequirePermission permission="MANAGE_INTERNAL_USERS">
                    <InternalUsersPage />
                  </RequirePermission>
                }
              />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/backoffice" replace />} />
          <Route path="*" element={<Navigate to="/backoffice" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
