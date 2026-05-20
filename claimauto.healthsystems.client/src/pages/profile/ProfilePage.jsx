import React from 'react';
import ProfileCard from '../../components/profile/ProfileCard';
import SecurityCard from '../../components/profile/SecurityCard';
import ActivityLog from '../../components/profile/ActivityLog';
import { useAuth } from '../../security/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../../App.css';

export default function ProfilePage() {
  const { user, login, token } = useAuth();
  const navigate = useNavigate();

  const setUser = (updated) => login(token, updated);

  if (!user) return null;

  return (
    <div className="profile-page container-fluid py-4 px-4">

      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <button
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
          onClick={() => navigate(-1)}
        >
          <i className="bi bi-arrow-left"></i> Back
        </button>
        <div>
          <h3 className="fw-bold mb-0" style={{ color: '#1e1b4b' }}>My Profile</h3>
          <p className="text-muted mb-0" style={{ fontSize: 13 }}>Manage your account settings and security</p>
        </div>
      </div>

      {/* Top row — Profile Info + MFA */}
      <div className="row g-4 mb-4">
        <div className="col-lg-6">
          <ProfileCard user={user} setUser={setUser} />
        </div>
        <div className="col-lg-6">
          <SecurityCard user={user} />
        </div>
      </div>

      {/* Bottom row — Recent Activity + Change Password */}
      <div className="row g-4">
        <div className="col-lg-6">
          <ActivityLog user={user} />
        </div>
        <div className="col-lg-6">
          <ChangePasswordCard />
        </div>
      </div>

    </div>
  );
}

// Inline small component — Change Password card lives here in the bottom row
import ChangePasswordModal from '../../components/identity/ChangePasswordModal';
function ChangePasswordCard() {
  const [show, setShow] = React.useState(false);
  return (
    <div className="profile-card card border-0 shadow-sm h-100">
      <div className="profile-card-header d-flex align-items-center gap-2 px-4 py-3">
        <div className="sec-icon-wrap blue">
          <i className="bi bi-key-fill"></i>
        </div>
        <span className="fw-semibold" style={{ color: '#1e1b4b', fontSize: 15 }}>Change Password</span>
      </div>
      <div className="card-body px-4 py-4 d-flex flex-column justify-content-between">
        <p className="text-muted mb-4" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Pick a strong password you don't use anywhere else. Recommend using a password manager.
        </p>
        <button
          className="btn w-100 d-flex align-items-center justify-content-center gap-2"
          style={{ border: '1.5px solid #667eea', color: '#667eea', borderRadius: 8, fontSize: 13 }}
          onClick={() => setShow(true)}
        >
          <i className="bi bi-pencil-square"></i> Change Password
        </button>
      </div>
      <ChangePasswordModal show={show} onClose={() => setShow(false)} />
    </div>
  );
}