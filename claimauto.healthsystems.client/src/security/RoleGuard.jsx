import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Wraps a route and checks if the logged-in user's role is allowed.
// Usage: <RoleGuard allowedRoles={['Admin']}><AdminPage /></RoleGuard>
export default function RoleGuard({ allowedRoles, children }) {
  const { user } = useAuth();

  if (!allowedRoles.includes(user?.role)) {
    // Redirect to a friendly unauthorized page, not a crash
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}