import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { postAuthPath } from './postAuthPath';
import { apiBaseUrl } from '../../shared/api/apiClient';

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    // The API redirects here with the token in the URL *fragment*
    // (`#token=...`), not a query string, so it's never sent to any server or
    // recorded in server/proxy logs or a Referer header — see
    // AuthController#googleAuthCallback.
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      'token',
    );

    // Drop the token from the visible URL/history as soon as we've read it.
    window.history.replaceState(null, '', window.location.pathname);

    if (!token) {
      // No token, redirect to login
      navigate('/login', { replace: true });
      return;
    }

    // Decode JWT to get user info (simple decode, not validation)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const user = {
        id: payload.sub,
        email: payload.email,
        businessName: '', // We'll fetch this from /auth/me
        slug: '',
        role: 'INDEPENDENT' as const,
      };

      setSession({ accessToken: token, user });

      // Fetch full user info
      fetch(`${apiBaseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((fullUser) => {
          setSession({ accessToken: token, user: fullUser });
          navigate(postAuthPath(fullUser), { replace: true });
        })
        .catch(() => {
          navigate(postAuthPath(user), { replace: true });
        });
    } catch (error) {
      console.error('Failed to process token:', error);
      navigate('/login', { replace: true });
    }
  }, [setSession, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-black dark:border-t-white"></div>
        <p className="text-gray-600 dark:text-gray-400">Iniciando sesión...</p>
      </div>
    </div>
  );
}
