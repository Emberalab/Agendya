import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMe, PENDING_REMEMBER_KEY } from './api';
import { useBackofficeAuthStore } from './backofficeAuthStore';
import { AuthLayout } from './AuthLayout';

/**
 * Landing page of the Google flow. The API puts the session token in the URL
 * fragment (never sent to any server); this page strips it from the address
 * bar right away, loads the staff profile with it, and stores the session
 * with the "Recordarme" choice made before leaving for Google.
 */
export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const setSession = useBackofficeAuthStore((state) => state.setSession);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode double-invokes effects in dev
    started.current = true;

    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      'token',
    );
    window.history.replaceState(null, '', window.location.pathname);

    let remember = false;
    try {
      remember = window.sessionStorage.getItem(PENDING_REMEMBER_KEY) === '1';
      window.sessionStorage.removeItem(PENDING_REMEMBER_KEY);
    } catch {
      /* storage blocked */
    }

    if (!token) {
      navigate('/backoffice/login?error=google_failed', { replace: true });
      return;
    }
    fetchMe(token)
      .then((user) => {
        setSession({ accessToken: token, user }, remember);
        navigate('/backoffice', { replace: true });
      })
      .catch(() =>
        navigate('/backoffice/login?error=google_failed', { replace: true }),
      );
  }, [navigate, setSession]);

  return (
    <AuthLayout>
      <p role="status" className="text-center text-sm text-text-muted">
        Completando el acceso con Google…
      </p>
    </AuthLayout>
  );
}
