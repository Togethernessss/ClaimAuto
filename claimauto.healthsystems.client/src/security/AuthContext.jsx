import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axiosClient';

const AuthContext = createContext(undefined);

// How often to ping /api/auth/me to detect admin-initiated deactivation.
const STATUS_POLL_MS = 30_000;

export function AuthProvider({ children }) {
  // Read localStorage synchronously BEFORE the first render so refresh works.
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  });

  // Message shown on the Login page when an admin deactivates this account.
  const [deactivatedMessage, setDeactivatedMessage] = useState(null);

  const login = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setDeactivatedMessage(null);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const clearDeactivatedMessage = useCallback(() => {
    setDeactivatedMessage(null);
  }, []);

  // ── Update a single field on the in-memory user + localStorage cache. ──
  // Used by Profile.jsx after the backend confirms a profile-photo save so
  // every consumer of useAuth() (Sidebar, navbar, banner) re-renders.
  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('user', JSON.stringify(next));
      } catch { /* localStorage quota: ignore */ }
      return next;
    });
  }, []);

  // Listen for events dispatched by the axios interceptor.
  useEffect(() => {
    const handleLogout = () => logout();

    const handleDeactivated = (e) => {
      const msg =
        e.detail?.message ||
        'Your account has been deactivated by the organisation. Please contact support.';
      setDeactivatedMessage(msg);
      logout();
    };

    window.addEventListener('auth:logout', handleLogout);
    window.addEventListener('auth:deactivated', handleDeactivated);

    return () => {
      window.removeEventListener('auth:logout', handleLogout);
      window.removeEventListener('auth:deactivated', handleDeactivated);
    };
  }, [logout]);

  // Poll /api/auth/me every 30 s while logged in.
  // UserStatusMiddleware intercepts this call and returns 401 ACCOUNT_DEACTIVATED
  // if the admin has deactivated the account — the axios interceptor fires
  // auth:deactivated and the effect above takes over from there.
  useEffect(() => {
    if (!token) return;

    const poll = async () => {
      try {
        await api.get('/api/auth/me');
      } catch {
        // Errors are handled by the axios interceptor — nothing extra needed here.
      }
    };

    const id = setInterval(poll, STATUS_POLL_MS);
    return () => clearInterval(id);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        deactivatedMessage,
        login,
        logout,
        clearDeactivatedMessage,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
