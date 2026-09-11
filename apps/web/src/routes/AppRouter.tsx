import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { PublicRoute } from './PublicRoute';

// Every route is code-split, including `/login`. It's the guaranteed entry point
// (the root and every unknown route redirect there), but keeping it in the
// initial bundle also dragged react-hook-form + Zod + the form resolver onto
// the startup path of *authenticated* routes like `/dashboard/agenda`, which
// never render a form on load. The login chunk is small and shares its
// react-hook-form/Zod chunk with the other auth pages.
const LoginPage = lazy(() =>
  import('../modules/auth/LoginPage').then((m) => ({
    default: m.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  import('../modules/auth/RegisterPage').then((m) => ({
    default: m.RegisterPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import('../modules/auth/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  })),
);
const GoogleCallbackPage = lazy(() =>
  import('../modules/auth/GoogleCallbackPage').then((m) => ({
    default: m.GoogleCallbackPage,
  })),
);
const DashboardLayout = lazy(() =>
  import('../modules/dashboard/DashboardLayout').then((m) => ({
    default: m.DashboardLayout,
  })),
);
const ProfilePage = lazy(() =>
  import('../modules/professionals/ProfilePage').then((m) => ({
    default: m.ProfilePage,
  })),
);
const ServicesPage = lazy(() =>
  import('../modules/services/ServicesPage').then((m) => ({
    default: m.ServicesPage,
  })),
);
const ServiceFormPage = lazy(() =>
  import('../modules/services/ServiceFormPage').then((m) => ({
    default: m.ServiceFormPage,
  })),
);
const SchedulePage = lazy(() =>
  import('../modules/schedules/SchedulePage').then((m) => ({
    default: m.SchedulePage,
  })),
);
const DaySchedulePage = lazy(() =>
  import('../modules/schedules/DaySchedulePage').then((m) => ({
    default: m.DaySchedulePage,
  })),
);
const AgendaPage = lazy(() =>
  import('../modules/bookings/AgendaPage').then((m) => ({
    default: m.AgendaPage,
  })),
);
const PublicBookingPage = lazy(() =>
  import('../modules/publicBooking/PublicBookingPage').then((m) => ({
    default: m.PublicBookingPage,
  })),
);
const BookingCancelPage = lazy(() =>
  import('../modules/publicBooking/BookingCancelPage').then((m) => ({
    default: m.BookingCancelPage,
  })),
);

function RouteFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
        Cargando…
      </p>
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          <Route path="/auth/callback" element={<GoogleCallbackPage />} />

          <Route element={<PrivateRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard/profile" element={<ProfilePage />} />
              <Route path="/dashboard/services" element={<ServicesPage />} />
              <Route
                path="/dashboard/services/new"
                element={<ServiceFormPage />}
              />
              <Route
                path="/dashboard/services/:id/edit"
                element={<ServiceFormPage />}
              />
              <Route path="/dashboard/schedule" element={<SchedulePage />} />
              <Route
                path="/dashboard/schedule/:day"
                element={<DaySchedulePage />}
              />
              <Route path="/dashboard/agenda" element={<AgendaPage />} />
            </Route>
          </Route>

          <Route path="/bookings/:token" element={<BookingCancelPage />} />
          <Route path="/:slug" element={<PublicBookingPage />} />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
