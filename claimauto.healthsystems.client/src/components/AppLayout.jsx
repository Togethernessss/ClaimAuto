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

  // Color the role badge based on role
  const roleBadgeBg = {
    Admin: 'danger',
    InsuranceStaff: 'warning',
    Hospital: 'info',
    Policyholder: 'success',
  }[user?.role] || 'secondary';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Top navbar */}
      <nav
        className="navbar navbar-dark shadow-sm px-4"
        style={{ backgroundColor: '#1e293b', height: 60 }}
      >
        <span className="navbar-brand fw-bold mb-0">
          <i className="bi bi-heart-pulse-fill text-danger me-2"></i>
          ClaimAuto
        </span>

        <div className="d-flex align-items-center">
          <span className={`badge bg-${roleBadgeBg} me-3`}>{user?.role}</span>
          <span className="text-white-50 me-3 small">
            <i className="bi bi-person-circle me-1"></i>
            {user?.name}
          </span>
          <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right me-1"></i> Logout
          </button>
        </div>
      </nav>

      {/* Sidebar + Main content */}
      <div className="d-flex">
        <Sidebar />
        <main className="flex-grow-1 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}