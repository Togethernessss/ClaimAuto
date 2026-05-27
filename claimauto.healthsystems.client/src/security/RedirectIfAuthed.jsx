import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getDashboardPath } from './permissions';

/**
 * Wraps public auth pages (/login, /register, /forgot-password, /reset-password,
 * /verify-mfa). If the user is already fully logged in, silently redirects them
 * to their dashboard so they can't see the login form while a session is active.
 *
 * Note: /verify-mfa is the middle of login (user has MFA token but no JWT yet),
 * so useAuth().user is still null and this guard correctly lets them through.
 */
export default function RedirectIfAuthed({ children }) {
  const { user } = useAuth();

  // Already logged in → send to dashboard (role-aware via permissions.js)
  if (user) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <>{children}</>;
}