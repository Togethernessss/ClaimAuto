import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../security/AuthContext';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import { NotificationProvider } from '../security/NotificationContext';
import { getAllAppeals } from '../services/appeals/appealService';

// ─── Appeal Bell (navbar icon with badge) ────────────────
function AppealBell() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [count, setCount] = useState(0);

    const isStaff = user?.role === 'Admin' || user?.role === 'InsuranceStaff';
export default function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = (e) => {
    const el = e.target;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
    setShowScrollTop(nearBottom);
  };

  const scrollToTop = () => {
    document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <NotificationProvider>
      <div style={{ height: '100vh', overflow: 'hidden', backgroundColor: '#f3f0ff' }}>

        {/* ─── Top navbar ─── */}
        <nav
          className="navbar navbar-dark shadow-sm px-4"
          style={{
            background: 'linear-gradient(135deg, #667eea 10%, #764ba2 100%)',
            height: 60,
            position: 'fixed',
            top: 0, left: 0, right: 0,
            zIndex: 1030,
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
              <i className="bi bi-heart-pulse-fill text-danger me-2"></i>
              ClaimAuto
            </span>

            {/* ─── Multi-tenant branding pill ────────────────────────
                Shows the user's insurance organization in a small pill
                colored with that organization's brand color. Hides on
                mobile to keep the navbar uncluttered. */}
            {user?.organizationName && (
              <div
                className="d-none d-md-flex align-items-center gap-2 px-2 py-1 rounded-pill"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  fontSize: 12,
                }}
                title={`Powered by ${user.organizationName}`}
              >
                <span
                  className="rounded-circle d-inline-block"
                  style={{
                    width: 8,
                    height: 8,
                    background: user.organizationBrandColor || '#ffffff',
                    boxShadow: `0 0 6px ${user.organizationBrandColor || '#ffffff'}99`,
                  }}
                />
                <span className="text-white opacity-75" style={{ fontSize: 11 }}>for</span>
                <span className="text-white fw-semibold">{user.organizationName}</span>
              </div>
            )}
          </div>

          <div className="d-flex align-items-center gap-3">
            <NotificationBell />
            <button
              className="btn btn-outline-light btn-sm"
              onClick={() => navigate('/profile')}
              title="My Profile"
            >
              <i className="bi bi-person-circle me-1"></i> Profile
            </button>
          </div>
        </nav>

        {/* ─── Sidebar ─── */}
        <div
          style={{
            position: 'fixed',
            top: 60, left: 0, bottom: 0,
            width: 250, overflowY: 'auto',
            zIndex: 1020,
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-250px)',
            transition: 'transform 0.3s ease',
          }}
        >
          <Sidebar />
        </div>

        {/* ─── Main content ─── */}
        <main
          id="main-content"
          onScroll={handleScroll}
          style={{
            position: 'absolute',
            top: 60,
            left: sidebarOpen ? 250 : 0,
            right: 0, bottom: 0,
            padding: '16px 0 0 0',
            overflowY: 'auto',
            transition: 'left 0.3s ease',
            backgroundColor: '#f3f0ff',
          }}
        >
          <Outlet />
        </main>

    const refresh = useCallback(async () => {
        try {
            const data = await getAllAppeals();
            const active = data.filter(a => a.status === 'Filed' || a.status === 'UnderReview').length;
            setCount(active);
        } catch {
            // silent
        }
    }, []);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 30000);
        return () => clearInterval(interval);
    }, [refresh]);

    if (!isStaff || count === 0) return null;

    return (
        <button
            onClick={() => navigate('/appeals')}
            title={`${count} active appeal${count !== 1 ? 's' : ''}`}
            style={{
                background: 'none', border: 'none',
                cursor: 'pointer', position: 'relative',
                padding: '4px 6px',
                display: 'flex', alignItems: 'center',
            }}
        >
            <i className="bi bi-megaphone" style={{ fontSize: 20, color: 'white' }}></i>
            <span style={{
                position: 'absolute', top: -2, right: -4,
                background: '#ef4444', color: 'white',
                fontSize: 10, fontWeight: 600,
                borderRadius: '50%',
                width: 18, height: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #764ba2',
            }}>
                {count > 99 ? '99+' : count}
            </span>
        </button>
    );
}

// ─── Main Layout ─────────────────────────────────────────
export default function AppLayout() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showScrollTop, setShowScrollTop] = useState(false);

    const handleScroll = (e) => {
        const el = e.target;
        const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
        setShowScrollTop(nearBottom);
    };

    const scrollToTop = () => {
        document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <NotificationProvider>
            <div style={{ height: '100vh', overflow: 'hidden', backgroundColor: '#f3f0ff' }}>

                {/* ─── Top navbar ─── */}
                <nav
                    className="navbar navbar-dark shadow-sm px-4"
                    style={{
                        background: 'linear-gradient(135deg, #667eea 10%, #764ba2 100%)',
                        height: 60,
                        position: 'fixed',
                        top: 0, left: 0, right: 0,
                        zIndex: 1030,
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
                        <span className="navbar-brand fw-bold mb-0">
                            <i className="bi bi-heart-pulse-fill text-danger me-2"></i>
                            ClaimAuto
                        </span>
                    </div>

                    <div className="d-flex align-items-center gap-3">
                        <AppealBell />
                        <NotificationBell />
                        <button
                            className="btn btn-outline-light btn-sm"
                            onClick={() => navigate('/profile')}
                            title="My Profile"
                        >
                            <i className="bi bi-person-circle me-1"></i> Profile
                        </button>
                    </div>
                </nav>

                {/* ─── Sidebar ─── */}
                <div
                    style={{
                        position: 'fixed',
                        top: 60, left: 0, bottom: 0,
                        width: 250, overflowY: 'auto',
                        zIndex: 1020,
                        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-250px)',
                        transition: 'transform 0.3s ease',
                    }}
                >
                    <Sidebar />
                </div>

                {/* ─── Main content ─── */}
                <main
                    id="main-content"
                    onScroll={handleScroll}
                    style={{
                        position: 'absolute',
                        top: 60,
                        left: sidebarOpen ? 250 : 0,
                        right: 0, bottom: 0,
                        padding: '16px 0 0 0',
                        overflowY: 'auto',
                        transition: 'left 0.3s ease',
                        backgroundColor: '#f3f0ff',
                    }}
                >
                    <Outlet />
                </main>

                {/* ─── Scroll to top button ─── */}
                {showScrollTop && (
                    <button
                        onClick={scrollToTop}
                        style={{
                            position: 'fixed',
                            bottom: 32, right: 32,
                            width: 44, height: 44,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none', color: 'white',
                            fontSize: 20, cursor: 'pointer',
                            zIndex: 1050,
                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'opacity 0.3s ease',
                        }}
                    >
                        <i className="bi bi-arrow-up"></i>
                    </button>
                )}

            </div>
        </NotificationProvider>
    );
}