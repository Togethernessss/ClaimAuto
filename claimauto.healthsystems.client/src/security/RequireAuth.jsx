import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RequireAuth() {
  const { isAuthenticated, user, deactivatedMessage } = useAuth();
  const location = useLocation();

  // 1. Not logged in → bounce appropriately
  if (!isAuthenticated) {
    // Admin deactivated this account — send to Login so the message is shown.
    if (deactivatedMessage) {
      return <Navigate to="/login" replace />;
    }
    // Normal unauthenticated access → HomePage.
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 2. Must change password → force change page
  if (
    user?.mustChangePassword &&
    location.pathname !== '/force-change-password'
  ) {
    return <Navigate to="/force-change-password" replace />;
  }

  return <Outlet />;
}
