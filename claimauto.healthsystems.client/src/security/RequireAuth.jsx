import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RequireAuth({ children }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // 1. Not logged in → bounce to HomePage
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 2. Logged in but on a temp password → force change before doing anything else
  //    Allow access ONLY to the force-change-password page itself, otherwise
  //    redirect there. This locks the user out of dashboards, profile, etc.
  if (user?.mustChangePassword && location.pathname !== '/force-change-password') {
    return <Navigate to="/force-change-password" replace />;
  }

  return <>{children}</>;
}