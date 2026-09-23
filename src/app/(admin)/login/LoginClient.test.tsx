/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginClient from './LoginClient';
import {
  apiFetch,
  fetchSession,
  setSessionCookie,
  setSessionUser,
  clearSessionCookie,
  clearSessionUser,
} from '@/lib/api';

jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
  fetchSession: jest.fn(),
  setSessionCookie: jest.fn(),
  setSessionUser: jest.fn(),
  clearSessionCookie: jest.fn(),
  clearSessionUser: jest.fn(),
}));

const replace = jest.fn();
const refresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

function fillAndSubmit(email = 'admin@nutrifit.cl', password = 'secreta123') {
  render(<LoginClient />);
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
}

describe('LoginClient (sesión HttpOnly)', () => {
  it('guarda el perfil y redirige cuando la sesión valida', async () => {
    (apiFetch as jest.Mock).mockResolvedValue({
      user: { id: 'u1', name: 'Admin', email: 'admin@nutrifit.cl', role: 'ADMIN' },
    });
    (fetchSession as jest.Mock).mockResolvedValue({ email: 'admin@nutrifit.cl', role: 'ADMIN' });

    fillAndSubmit();

    await waitFor(() => expect(setSessionUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'admin@nutrifit.cl' }),
    ));
    expect(setSessionCookie).toHaveBeenCalled();
    expect(fetchSession).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/admin');
    expect(refresh).toHaveBeenCalled();
  });

  it('muestra error de cookies y limpia sesión si /auth/me falla', async () => {
    (apiFetch as jest.Mock).mockResolvedValue({
      user: { id: 'u1', name: 'Admin', email: 'admin@nutrifit.cl', role: 'ADMIN' },
    });
    (fetchSession as jest.Mock).mockResolvedValue(null);

    fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByText(/bloqueó las cookies/i)).toBeInTheDocument(),
    );
    expect(clearSessionCookie).toHaveBeenCalled();
    expect(clearSessionUser).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('muestra el mensaje del servidor ante credenciales inválidas', async () => {
    (apiFetch as jest.Mock).mockRejectedValue(new Error('Credenciales inválidas'));

    fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument(),
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
