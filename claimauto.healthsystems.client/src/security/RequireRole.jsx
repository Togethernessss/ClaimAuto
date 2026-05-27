import { useAuth } from './AuthContext';
import AccessDenied from '../pages/AccessDenied';

/**
 * Route-level guard for role-restricted pages.
 *
 * Renders <AccessDenied /> in place (same URL, same layout) when the
 * logged-in user's role isn't in the allowed list. URL stays unchanged
 * so the user can use Back, refresh, or copy the URL without confusion.
 *
 * SECURITY NOTE: This is a UX guard, NOT a security boundary.
 * The real boundary is [Authorize(Roles="...")] on the backend.
 *
 * Usage:
 *   <Route path="/audit-logs" element={
 *     <RequireRole roles={['Admin']}>
 *       <AuditLogs />
 *     </RequireRole>
 *   } />
 */
export default function RequireRole({ roles, children }) {
  const { user } = useAuth();

  // Defensive: if somehow no user (shouldn't happen inside RequireAuth) — deny
  if (!user) return <AccessDenied />;

  // Role mismatch — deny in place
  if (!Array.isArray(roles) || !roles.includes(user.role)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}