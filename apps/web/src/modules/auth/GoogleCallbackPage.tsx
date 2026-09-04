import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from './authStore';

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    const token = searchParams.get('token');

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
      };

      setSession({ accessToken: token, user });

      // Fetch full user info
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((fullUser) => {
          setSession({ accessToken: token, user: fullUser });
          navigate('/dashboard/profile', { replace: true });
        })
        .catch(() => {
          navigate('/dashboard/profile', { replace: true });
        });
    } catch (error) {
      console.error('Failed to process token:', error);
      navigate('/login', { replace: true });
    }
  }, [searchParams, setSession, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-black dark:border-t-white"></div>
        <p className="text-gray-600 dark:text-gray-400">Iniciando sesión...</p>
      </div>
    </div>
  );
}
