import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../security/AuthContext';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  
  const roleBadgeBg = {
    Admin: 'danger',
    InsuranceStaff: 'warning',
    Hospital: 'info',
    Policyholder: 'success',
  }[user?.role] || 'secondary';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* ─── Top navbar (fixed at top) ─── */}
      <nav
        className="navbar navbar-dark shadow-sm px-4"
        style={{
          background: 'linear-gradient(135deg, #667eea 10%, #764ba2 100%)',
          height: 60,
          position: 'fixed',         
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1030,              
        }}
      >
        <span className="navbar-brand fw-bold mb-0">
          <i className="bi bi-heart-pulse-fill text-danger me-2"></i>
          ClaimAuto
        </span>

        <div className="d-flex align-items-center">
          <span className="text-white-50 me-3 small">
            <i className="bi bi-person-circle me-1"></i>
            {user?.name}
          </span>
          <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right me-1"></i> Logout
          </button>
        </div>
      </nav>

      {/* ─── Sidebar (fixed on left, below navbar) ─── */}
      <div
        style={{
          position: 'fixed',
          top: 60,                   
          left: 0,
          bottom: 0,
          width: 250,
          overflowY: 'auto',         
          zIndex: 1020,
        }}
      >
        <Sidebar />
      </div>

      {/* ─── Main content (offset to make space for navbar + sidebar) ─── */}
      <main
        style={{
          marginTop: 60,            
          marginLeft: 250,           
          padding: '24px',
          minHeight: 'calc(100vh - 60px)',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}