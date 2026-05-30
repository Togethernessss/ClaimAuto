import axios from 'axios';
import { addError } from '../services/errorLogService';

// One axios instance shared across the entire app.
const api = axios.create({
  baseURL: 'http://localhost:7182',
  headers: {
    'Content-Type': 'application/json',
  },
});

// REQUEST interceptor — automatically attach JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// RESPONSE interceptor — handle 401 responses + capture errors for admin log.
// Distinguishes between normal token expiry and admin-initiated deactivation.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status  = error.response?.status ?? null;
    const code    = error.response?.data?.code;
    const message = error.response?.data?.message;

    if (status === 401) {
      if (code === 'ACCOUNT_DEACTIVATED') {
        // Admin deactivated this user — fire a specific event with the message
        // so AuthContext can show the "contact support" banner on Login.
        window.dispatchEvent(
          new CustomEvent('auth:deactivated', { detail: { message } })
        );
      } else {
        // Regular 401 (token expired / invalid) — silent logout.
        window.dispatchEvent(new Event('auth:logout'));
      }

      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } else {
      // ── Capture all non-401 HTTP errors for the admin Session Error Log ──
      // Excludes 401 (auth flow above) and request cancellations.
      const isCancelled = axios.isCancel(error);
      if (!isCancelled) {
        const rawMsg = error.response?.data?.message
                    || error.response?.data
                    || error.message
                    || 'Unknown error';
        addError({
          status:  status,
          method:  error.config?.method?.toUpperCase() ?? '?',
          url:     error.config?.url ?? 'unknown endpoint',
          message: typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg),
        });
      }
    }

    return Promise.reject(error);
  }
);

export default api;
