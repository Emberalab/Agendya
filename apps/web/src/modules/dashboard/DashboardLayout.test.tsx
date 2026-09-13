import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../auth/authStore';
import { DashboardLayout } from './DashboardLayout';
import { SuperAdminHome } from './SuperAdminHome';

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<SuperAdminHome />} />
            <Route path="/dashboard/admin" element={<h1>Admin</h1>} />
            <Route path="/dashboard/profile" element={<h1>Perfil</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardLayout', () => {
  afterEach(() => {
    useAuthStore.setState({ accessToken: null, user: null });
  });

  it('hides the professional nav for a super admin', () => {
    useAuthStore.setState({
      accessToken: 'token',
      user: {
        id: '00000000-0000-4000-8000-000000000099',
        email: 'info@agendya.co',
        businessName: 'Agendya',
        slug: 'agendya',
        role: 'SUPER_ADMIN',
      },
    });

    renderAt('/dashboard');

    expect(
      screen.getByRole('heading', { name: 'Hola, SuperAdmin' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Principal' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Agenda' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('lets a super admin open the admin panel', () => {
    useAuthStore.setState({
      accessToken: 'token',
      user: {
        id: '00000000-0000-4000-8000-000000000099',
        email: 'info@agendya.co',
        businessName: 'Agendya',
        slug: 'agendya',
        role: 'SUPER_ADMIN',
      },
    });

    renderAt('/dashboard/admin');

    expect(screen.getByRole('heading', { name: 'Admin' })).toBeInTheDocument();
  });

  it('keeps the professional sidebar for an independent account', () => {
    useAuthStore.setState({
      accessToken: 'token',
      user: {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'pro@salon.com',
        businessName: 'Salón',
        slug: 'salon',
        role: 'INDEPENDENT',
      },
    });

    renderAt('/dashboard/profile');

    expect(screen.getByRole('heading', { name: 'Perfil' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Agenda' }).length).toBeGreaterThan(
      0,
    );
  });

  it('keeps independents off the admin panel', () => {
    useAuthStore.setState({
      accessToken: 'token',
      user: {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'pro@salon.com',
        businessName: 'Salón',
        slug: 'salon',
        role: 'INDEPENDENT',
      },
    });

    renderAt('/dashboard/admin');

    expect(screen.getByRole('heading', { name: 'Perfil' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Admin' })).toBeNull();
  });
});
