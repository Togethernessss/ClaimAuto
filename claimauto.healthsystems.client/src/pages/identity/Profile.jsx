import { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Button, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import ProfileInfoCard from '../../components/identity/ProfileInfoCard';
import MfaCard from '../../components/identity/MfaCard';
import AccountInfoCard from '../../components/identity/AccountInfoCard';
import ChangePasswordCard from '../../components/identity/ChangePasswordCard';
import SecurityOverviewCard from '../../components/identity/SecurityOverviewCard';

// Role → accent colour (matches app theme)
const ROLE_COLOR = {
  Admin:          '#ef4444',
  InsuranceStaff: '#f59e0b',
  Hospital:       '#3b82f6',
  Policyholder:   '#10b981',
};

// Role → Bootstrap icon class
const ROLE_ICON = {
  Admin:          'bi-shield-fill-check',
  InsuranceStaff: 'bi-person-badge-fill',
  Hospital:       'bi-hospital',
  Policyholder:   'bi-person-fill-check',
};

export default function Profile() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const fileInputRef = useRef(null);

  // ── Per-user localStorage key ─────────────────────────────────
  // Different users on the same browser get their own photo.
  const storageKey = user?.userID ? `profilePhoto_${user.userID}` : null;

  // Initialise photo from localStorage on first render
  const [photo, setPhoto] = useState(() =>
    storageKey ? (localStorage.getItem(storageKey) ?? null) : null
  );

  // If the logged-in user changes (logout → login as someone else),
  // reload the photo for the new user.
  useEffect(() => {
    setPhoto(storageKey ? (localStorage.getItem(storageKey) ?? null) : null);
  }, [storageKey]);

  // ── Open the hidden file picker ───────────────────────────────
  const handlePhotoClick = () => fileInputRef.current?.click();

  // ── Handle the selected file ──────────────────────────────────
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, GIF, WebP…).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2 MB. Please choose a smaller file.');
      return;
    }

    // Convert to base64 so it can be stored in localStorage
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setPhoto(base64);
      try {
        if (storageKey) localStorage.setItem(storageKey, base64);
      } catch {
        // localStorage quota exceeded – photo shows this session only
        console.warn('Could not persist profile photo to localStorage.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset so the same file can be re-selected
  };

  // ── Remove photo ──────────────────────────────────────────────
  const handleRemovePhoto = (e) => {
    e.stopPropagation(); // don't trigger the upload button
    setPhoto(null);
    if (storageKey) localStorage.removeItem(storageKey);
  };

  if (!user) return null;

  // Build initials fallback (up to 2 letters, e.g. "John Doe" → "JD")
  const initials = user.name
    ? user.name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const roleColor = ROLE_COLOR[user.role] ?? '#6366f1';
  const roleIcon  = ROLE_ICON[user.role]  ?? 'bi-person-fill';

  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : '—';

  return (
    <Container fluid className="px-3 px-md-4 pb-5">

      {/* ── Back button ───────────────────────────────────────── */}
      <div className="mb-3 pt-1">
        <Button
          variant="link"
          onClick={() => navigate(-1)}
          className="p-0 text-decoration-none d-inline-flex align-items-center gap-1"
          style={{ color: '#667eea', fontWeight: 500 }}
        >
          <i className="bi bi-arrow-left-circle-fill" style={{ fontSize: 18 }}></i>
          &nbsp;Back
        </Button>
      </div>

      {/* ════════════════════════════════════════════════════════
          HERO CARD  —  banner + avatar + name/meta
      ════════════════════════════════════════════════════════ */}
      <div
        className="rounded-4 overflow-hidden mb-4"
        style={{
          boxShadow: '0 4px 24px rgba(102,126,234,0.14)',
          border: '1px solid rgba(102,126,234,0.1)',
        }}
      >
        {/* Gradient banner */}
        <div
          style={{
            height: 130,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative translucent circles */}
          <div style={{ position:'absolute', top:-30,  right:-30,  width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
          <div style={{ position:'absolute', bottom:-40, left:180,  width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
          <div style={{ position:'absolute', top:10,  left:-20,  width:80,  height:80,  borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />
        </div>

        {/* White section below the banner */}
        <div className="bg-white px-3 px-md-4 pb-4">
          <div
            className="d-flex flex-wrap align-items-end gap-3"
            style={{ marginTop: -52 }}
          >

            {/* ── Avatar with upload / remove buttons ────────── */}
            <div style={{ position: 'relative', flexShrink: 0 }}>

              {/* The circle itself */}
              <div
                style={{
                  width: 104, height: 104, borderRadius: '50%',
                  border: '4px solid white',
                  boxShadow: '0 4px 20px rgba(102,126,234,0.3)',
                  overflow: 'hidden',
                  background: photo
                    ? 'transparent'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  userSelect: 'none',
                }}
              >
                {photo ? (
                  <img
                    src={photo}
                    alt={user.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ color:'white', fontSize:36, fontWeight:700, letterSpacing:2 }}>
                    {initials}
                  </span>
                )}
              </div>

              {/* Camera button — bottom-right of the avatar */}
              <button
                onClick={handlePhotoClick}
                title="Upload profile photo"
                style={{
                  position:'absolute', bottom:4, right:0,
                  width:30, height:30, borderRadius:'50%',
                  background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border:'3px solid white',
                  color:'white', fontSize:12,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', padding:0,
                  boxShadow:'0 2px 8px rgba(102,126,234,0.4)',
                }}
              >
                <i className="bi bi-camera-fill"></i>
              </button>

              {/* Remove photo × — top-right (only when a photo is set) */}
              {photo && (
                <button
                  onClick={handleRemovePhoto}
                  title="Remove photo"
                  style={{
                    position:'absolute', top:4, right:0,
                    width:22, height:22, borderRadius:'50%',
                    background:'#ef4444', border:'2px solid white',
                    color:'white', fontSize:10,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer', padding:0,
                  }}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}

              {/* Hidden file picker — triggered by the camera button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
            </div>

            {/* ── Name + meta ─────────────────────────────────── */}
            <div style={{ paddingBottom: 4, paddingTop: 54, flex: 1 }}>
              <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                <h4 className="fw-bold mb-0" style={{ color: '#1e1b4b' }}>
                  {user.name}
                </h4>

                {/* Role badge */}
                <Badge
                  className="rounded-pill"
                  style={{ background: roleColor, fontSize: 11, padding: '4px 10px' }}
                >
                  <i className={`bi ${roleIcon} me-1`}></i>
                  {user.role === 'InsuranceStaff' ? 'Staff' : user.role}
                </Badge>

                {/* MFA badge — only shown when enabled */}
                {user.mfaEnabled && (
                  <Badge bg="success" className="rounded-pill" style={{ fontSize: 10, padding: '3px 8px' }}>
                    <i className="bi bi-shield-check me-1"></i>MFA On
                  </Badge>
                )}
              </div>

              {/* Secondary meta row */}
              <div className="d-flex flex-wrap gap-3 text-muted" style={{ fontSize: 13 }}>
                <span><i className="bi bi-envelope me-1"></i>{user.email}</span>
                {user.phone     && <span><i className="bi bi-telephone me-1"></i>{user.phone}</span>}
                {user.department && <span><i className="bi bi-building me-1"></i>{user.department}</span>}
                <span><i className="bi bi-calendar3 me-1"></i>Joined {joined}</span>
                {user.organizationName && (
                  <span><i className="bi bi-bank me-1"></i>{user.organizationName}</span>
                )}
              </div>
            </div>

            {/* Upload hint — visible on large screens only */}
            <div
              className="d-none d-lg-flex align-items-center gap-1 pb-2"
              style={{ color: '#c4b5fd', fontSize: 12 }}
            >
              <i className="bi bi-camera me-1"></i>
              Click the camera icon to update your photo
            </div>

          </div>
        </div>
      </div>

      {/* ── Section title ─────────────────────────────────────── */}
      <div className="mb-3">
        <h5 className="fw-bold mb-0" style={{ color: '#1e1b4b' }}>
          <i className="bi bi-gear-fill me-2" style={{ color: '#667eea' }}></i>
          Account Settings
        </h5>
        <small className="text-muted">
          Manage your profile details and security preferences
        </small>
      </div>

      {/* ════════════════════════════════════════════════════════
          CARDS GRID  —  profile left  |  security right
      ════════════════════════════════════════════════════════ */}
      <Row className="g-4">

        
<Col lg={7}>
  <div className="d-flex flex-column gap-3">
    <ProfileInfoCard user={user} />
    <SecurityOverviewCard user={user} />
  </div>
</Col>
        <Col lg={5}>
          <div className="d-flex flex-column gap-3">
            <ChangePasswordCard />
            <MfaCard user={user} />
            <AccountInfoCard user={user} />
          </div>
        </Col>

      </Row>
    </Container>
  );
}