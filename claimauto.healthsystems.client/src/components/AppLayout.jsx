import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../security/AuthContext';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import { NotificationProvider } from '../security/NotificationContext';
import { getAllAppeals } from '../services/appeals/appealService';
import { getPagePath } from '../security/permissions';

function AppealBell() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const [count, setCount] = useState(0);

  const isStaff =
    user?.role === 'Admin' ||
    user?.role === 'InsuranceStaff';

  const failCountRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!isStaff) return;
    if (failCountRef.current >= 3) return;
    try {
      const data   = await getAllAppeals();
      const active = data.filter(
        a => a.status === 'Filed' ||
             a.status === 'UnderReview'
      ).length;
      setCount(active);
      failCountRef.current = 0;
    } catch {
      failCountRef.current += 1;
    }
  }, [isStaff]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (!isStaff || count === 0) return null;

  return (
    <button
      onClick={() => navigate(getPagePath(user?.role, '/appeals'))}
      title={`${count} active appeal${count !== 1 ? 's' : ''}`}
      style={{
        background: 'none', border: 'none',
        cursor: 'pointer', position: 'relative',
        padding: '4px 6px',
        display: 'flex', alignItems: 'center',
      }}
    >
      <i className="bi bi-megaphone"
        style={{ fontSize: 20, color: 'white' }}></i>
      <span style={{
        position: 'absolute', top: -2, right: -4,
        background: '#ef4444', color: 'white',
        fontSize: 10, fontWeight: 600,
        borderRadius: '50%',
        width: 18, height: 18,
        display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #764ba2',
      }}>
        {count > 99 ? '99+' : count}
      </span>
    </button>
  );
}

function NavProfileAvatar() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  // Source of truth: user.profilePhoto from AuthContext (backend-persisted).
  // localStorage is only a fast-paint fallback for the very first render before
  // /me has returned. The 1-second polling hack is no longer needed —
  // updateUser() in AuthContext triggers a re-render here automatically.
  const storageKey = user?.userID
    ? `profilePhoto_${user.userID}` : null;

  const photo =
    user?.profilePhoto
      ?? (storageKey ? localStorage.getItem(storageKey) : null)
      ?? null;

  const initials = user?.name
    ? user.name.trim().split(/\s+/)
        .map((w) => w[0]).join('')
        .toUpperCase().slice(0, 2)
    : '?';

  return (
    <button
      onClick={() => navigate('/profile')}
      title="My Profile"
      style={{
        background: 'none',
        border: '2px solid rgba(255,255,255,0.5)',
        borderRadius: '50%',
        width: 36, height: 36,
        padding: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'white';
        e.currentTarget.style.transform   = 'scale(1.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor =
          'rgba(255,255,255,0.5)';
        e.currentTarget.style.transform   = 'scale(1)';
      }}
    >
      {photo ? (
        <img
          src={photo}
          alt={user?.name}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <span style={{
          color: 'white',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 0.5,
          background: 'rgba(255,255,255,0.2)',
          width: '100%', height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {initials}
        </span>
      )}
    </button>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuth();

  return (
    <NotificationProvider>
      <div style={{
        height:          '100vh',
        overflow:        'visible', // ← KEY FIX
        backgroundColor: '#f3f0ff',
      }}>

        <nav
          className="navbar navbar-dark shadow-sm px-4"
          style={{
            background:
              'linear-gradient(135deg, ' +
              '#667eea 10%, #764ba2 100%)',
            height:   60,
            position: 'fixed',
            top: 0, left: 0, right: 0,
            zIndex:   1030,
          }}
        >
          <div className="d-flex align-items-center">
            <button
              className="btn btn-link text-white p-0 me-3"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ fontSize: 22, textDecoration: 'none' }}
            >
              <i className="bi bi-list"></i>
            </button>
            <span className="navbar-brand fw-bold mb-0 me-3">
              <i className="bi bi-heart-pulse-fill
                text-danger me-2"></i>
              ClaimAuto
            </span>

            {user?.organizationName && (
              <div
                className="d-none d-md-flex
                  align-items-center gap-2
                  px-2 py-1 rounded-pill"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border:
                    '1px solid rgba(255,255,255,0.25)',
                  fontSize: 12,
                }}
                title={
                  `Powered by ${user.organizationName}`}
              >
                <span
                  className="rounded-circle d-inline-block"
                  style={{
                    width: 8, height: 8,
                    background:
                      user.organizationBrandColor ||
                      '#ffffff',
                    boxShadow:
                      `0 0 6px ${
                        user.organizationBrandColor ||
                        '#ffffff'}99`,
                  }}
                />
                <span className="text-white opacity-75"
                  style={{ fontSize: 11 }}>
                  for
                </span>
                <span className="text-white fw-semibold">
                  {user.organizationName}
                </span>
              </div>
            )}
          </div>

          <div className="d-flex align-items-center gap-3">
            <AppealBell />
            <NotificationBell />
            <NavProfileAvatar />
          </div>
        </nav>

        <div style={{
          position:     'fixed',
          top: 60, left: 0, bottom: 0,
          width:        sidebarOpen ? 250 : 72,
          overflowY:    'auto',
          overflowX:    'hidden',
          zIndex:       1020,
          transition:   'width 0.3s ease',
          borderRadius: '0 22px 22px 0',
        }}>
          <Sidebar collapsed={!sidebarOpen} />
        </div>

        <main
          id="main-content"
          style={{
            position:        'absolute',
            top:             60,
            left:            sidebarOpen ? 250 : 72,
            right:           0,
            bottom:          0,
            padding:         '16px 0 0 0',
            overflowY:       'auto',
            transition:      'left 0.3s ease',
            backgroundColor: '#f3f0ff',
          }}
        >
          <Outlet />
        </main>

      </div>
    </NotificationProvider>
  );
}