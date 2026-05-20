import React, { useState } from 'react';

export default function AvatarUploader({ name, photo, size = 80, userID, onPhotoChange }) {
  // On mount, prefer the passed photo prop, then fall back to localStorage
  const [preview, setPreview] = useState(() => {
    if (photo) return photo;
    if (userID) return localStorage.getItem('avatar_' + userID) || null;
    return null;
  });

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setPreview(base64);
      // Save to localStorage so it survives refresh
      if (userID) localStorage.setItem('avatar_' + userID, base64);
      // Notify parent (ProfileCard → AuthContext) so navbar/sidebar stay in sync
      if (onPhotoChange) onPhotoChange(base64);
    };
    reader.readAsDataURL(file);
  };

  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="position-relative flex-shrink-0" style={{ width: size, height: size }}>
      {preview ? (
        <img
          src={preview}
          alt="Profile"
          className="rounded-circle shadow"
          style={{ width: size, height: size, objectFit: 'cover' }}
        />
      ) : (
        <div
          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow"
          style={{
            width: size, height: size,
            fontSize: size * 0.28,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            letterSpacing: 1,
          }}
        >
          {initials}
        </div>
      )}
      <label
        className="avatar-cam-btn position-absolute d-flex align-items-center justify-content-center bg-white rounded-circle"
        style={{ bottom: 2, right: 2, width: 26, height: 26, cursor: 'pointer', border: '1.5px solid #ede9ff' }}
        title="Change photo"
      >
        <i className="bi bi-camera-fill" style={{ fontSize: 12, color: '#667eea' }}></i>
        <input type="file" accept="image/*" onChange={handleUpload} hidden />
      </label>
    </div>
  );
}