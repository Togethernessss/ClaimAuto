// src/security/RequireRole.jsx
// Route-level role guard.
// Wraps a route — if the logged-in user's role is not in the allowed list,
// redirects to /dashboard instead of showing the page.
// This is the frontend's actual security boundary (hiding nav links is just UX).

import { Navigate } from 'react-router-dom';
import { useAuth }  from './AuthContext';

export default function RequireRole({ roles, children }) {
  const { user } = useAuth();

  // Not logged in → AuthContext / RequireAuth handles this, but guard here too
  if (!user) return <Navigate to="/login" replace />;

  // Logged in but wrong role → send to their own dashboard
  if (!roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}