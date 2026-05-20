import React, { useState } from 'react';
import AvatarUploader from './AvatarUploader';
import axiosClient from '../../api/axiosClient';

export default function ProfileCard({ user, setUser }) {
  const [editing, setEditing] = useState(false);
  const [phone, setPhone]     = useState(user.phone ?? '');
  const [saving, setSaving]   = useState(false);

  const saveChanges = async () => {
    setSaving(true);
    try {
      await axiosClient.put(`/api/users/${user.userID}`, { phone });
      setUser({ ...user, phone });
      setEditing(false);
    } catch {
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setPhone(user.phone ?? '');
    setEditing(false);
  };

  // When photo is uploaded, patch AuthContext so navbar/sidebar reflect it immediately
  const handlePhotoChange = (base64) => {
    setUser({ ...user, photo: base64 });
  };

  // On mount, also restore photo from localStorage if AuthContext doesn't have it yet
  const resolvedPhoto = user.photo
    || (user.userID ? localStorage.getItem('avatar_' + user.userID) : null);

  return (
    <div className="profile-card card border-0 shadow-sm overflow-hidden h-100">

      {/* Header bar */}
      <div className="profile-card-header d-flex align-items-center justify-content-between px-4 py-3">
        <div className="d-flex align-items-center gap-2">
          <div className="sec-icon-wrap">
            <i className="bi bi-person-vcard-fill"></i>
          </div>
          <span className="fw-semibold" style={{ color: '#1e1b4b', fontSize: 15 }}>Profile Information</span>
        </div>
        {!editing ? (
          <button className="profile-edit-btn d-flex align-items-center gap-1" onClick={() => setEditing(true)}>
            <i className="bi bi-pencil-fill" style={{ fontSize: 11 }}></i> Edit Profile
          </button>
        ) : (
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit} disabled={saving}>Cancel</button>
            <button className="btn btn-sm btn-primary" onClick={saveChanges} disabled={saving}>
              {saving
                ? <><span className="spinner-border spinner-border-sm me-1" />Saving…</>
                : <><i className="bi bi-check-lg me-1" />Save</>}
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="card-body px-4 pb-3 pt-3">
        <div className="d-flex gap-4">

          <AvatarUploader
            name={user.name}
            photo={resolvedPhoto}
            size={110}
            userID={user.userID}
            onPhotoChange={handlePhotoChange}
          />

          <div className="flex-grow-1">
            <h5 className="fw-bold mb-0" style={{ color: '#1e1b4b' }}>{user.name}</h5>
            <p className="mb-3" style={{ color: '#667eea', fontWeight: 600, fontSize: 13 }}>
              {user.department ?? user.role}
            </p>

            <div className="profile-fields">

              <div className="profile-field-row">
                <i className="bi bi-envelope field-icon"></i>
                <span className="field-label">Email:</span>
                <span className="field-value">{user.email}</span>
              </div>

              <div className="profile-field-row">
                <i className="bi bi-telephone field-icon"></i>
                <span className="field-label">Phone:</span>
                {editing ? (
                  <input
                    type="text"
                    className="form-control form-control-sm field-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone"
                  />
                ) : (
                  <>
                    <span className="field-value">{phone || <span className="text-muted">Not set</span>}</span>
                    <button className="profile-inline-edit ms-2" onClick={() => setEditing(true)}>
                      <i className="bi bi-pencil-fill me-1" style={{ fontSize: 10 }}></i>Edit
                    </button>
                  </>
                )}
              </div>

              <div className="profile-field-row">
                <i className="bi bi-person-badge field-icon"></i>
                <span className="field-label">Role:</span>
                <span className="field-value">{user.role}</span>
              </div>

              <div className="profile-field-row">
                <i className="bi bi-building field-icon"></i>
                <span className="field-label">Department:</span>
                <span className="field-value">{user.department ?? '—'}</span>
              </div>

              <div className="profile-field-row">
                <i className="bi bi-check-lg field-icon"></i>
                <span className="field-label">Account Status:</span>
                <span className="status-active-btn">{user.status}</span>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="profile-card-footer d-flex gap-4 flex-wrap px-4 py-2">
        <div className="d-flex align-items-center gap-2" style={{ fontSize: 12, color: '#64748b' }}>
          <i className="bi bi-hash"></i>
          <span>User ID: <strong style={{ color: '#1e1b4b' }}>{user.userID}</strong></span>
        </div>
        <div className="d-flex align-items-center gap-2" style={{ fontSize: 12, color: '#64748b' }}>
          <i className="bi bi-calendar3"></i>
          <span>Account Created: <strong style={{ color: '#1e1b4b' }}>
            {user.createdAt
              ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : '—'}
          </strong></span>
        </div>
      </div>

    </div>
  );
}