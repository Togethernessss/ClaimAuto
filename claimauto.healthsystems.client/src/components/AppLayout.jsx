import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../security/AuthContext';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import { NotificationProvider } from '../security/NotificationContext';

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
            <span className="navbar-brand fw-bold mb-0">
              <i className="bi bi-heart-pulse-fill text-danger me-2"></i>
              ClaimAuto
            </span>
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