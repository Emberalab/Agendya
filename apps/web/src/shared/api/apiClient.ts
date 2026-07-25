import axios from 'axios';
import { useAuthStore } from '../../modules/auth/authStore';

// Falls back to whatever host the page was loaded from (e.g. a LAN IP when the
// frontend is opened from another device via `vite --host`), so the API stays
// reachable without hardcoding a machine-specific address.
const apiBaseUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4000`;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
});

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
