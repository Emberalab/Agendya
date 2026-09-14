import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACCOUNT_NOT_FOUND_CODE } from '@agendya/types';
import { ApiError } from '../../shared/api/apiClient';
import { login } from './api';
import { LoginPage } from './LoginPage';

vi.mock('./api', () => ({
  login: vi.fn(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
  });

  it('stays on login and offers a register CTA when the email is unknown', async () => {
    vi.mocked(login).mockRejectedValue(
      new ApiError(401, {
        code: ACCOUNT_NOT_FOUND_CODE,
        message: 'No hay una cuenta con este correo.',
      }),
    );

    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<p>Registro</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.type(
      screen.getByLabelText('Correo electrónico *'),
      'mimiyin@ynnord.top',
    );
    await user.type(screen.getByLabelText('Contraseña *'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(
      await screen.findByText(/no tenemos una cuenta con este correo/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute(
      'href',
      '/register?email=mimiyin%40ynnord.top',
    );
    expect(screen.queryByText('Registro')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Registro')).toBeInTheDocument();
  });
});
