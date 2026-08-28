import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AgendaPage } from '../modules/bookings/AgendaPage';
import { ForgotPasswordPage } from '../modules/auth/ForgotPasswordPage';
import { GoogleCallbackPage } from '../modules/auth/GoogleCallbackPage';
import { LoginPage } from '../modules/auth/LoginPage';
import { RegisterPage } from '../modules/auth/RegisterPage';
import { DashboardLayout } from '../modules/dashboard/DashboardLayout';
import { ProfilePage } from '../modules/professionals/ProfilePage';
import { BookingCancelPage } from '../modules/publicBooking/BookingCancelPage';
import { PublicBookingPage } from '../modules/publicBooking/PublicBookingPage';
import { SchedulePage } from '../modules/schedules/SchedulePage';
import { ServicesPage } from '../modules/services/ServicesPage';
import { PrivateRoute } from './PrivateRoute';
import { PublicRoute } from './PublicRoute';

export function AppRouter() {
  return (
    <BrowserRouter>
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
            <Route path="/dashboard/schedule" element={<SchedulePage />} />
            <Route path="/dashboard/agenda" element={<AgendaPage />} />
          </Route>
        </Route>

        <Route path="/bookings/:token" element={<BookingCancelPage />} />
        <Route path="/:slug" element={<PublicBookingPage />} />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
