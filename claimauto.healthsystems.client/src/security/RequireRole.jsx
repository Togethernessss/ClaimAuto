import { Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import AccessDenied from '../pages/AccessDenied';

export default function RequireRole({ roles }) {
  const { user } = useAuth();

  // Defensive: no user — deny
  if (!user) return <AccessDenied />;

  // Wrong role — show AccessDenied (Madhav's behavior kept)
  if (!Array.isArray(roles) || !roles.includes(user.role)) {
    return <AccessDenied />;
  }

  return <Outlet />;
}