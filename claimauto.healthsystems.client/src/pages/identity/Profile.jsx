import { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Button, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import ProfileInfoCard      from '../../components/identity/ProfileInfoCard';
import MfaCard              from '../../components/identity/MfaCard';
import AccountInfoCard      from '../../components/identity/AccountInfoCard';
import ChangePasswordCard   from '../../components/identity/ChangePasswordCard';
import SecurityOverviewCard from '../../components/identity/SecurityOverviewCard';

const ROLE_COLOR = {
  Admin:          '#ef4444',
  InsuranceStaff: '#f59e0b',
  Hospital:       '#3b82f6',
  Policyholder:   '#10b981',
};

const ROLE_ICON = {
  Admin:          'bi-shield-fill-check',
  InsuranceStaff: 'bi-person-badge-fill',
  Hospital:       'bi-hospital',
  Policyholder:   'bi-person-fill-check',
};

export default function Profile() {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);
  const avatarRef    = useRef(null);
  const dropdownRef  = useRef(null);

  const storageKey = user?.userID
    ? `profilePhoto_${user.userID}` : null;

  const [photo,         setPhoto]         = useState(() =>
    storageKey
      ? (localStorage.getItem(storageKey) ?? null)
      : null
  );
  const [showOptions,   setShowOptions]   = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [dropPos,       setDropPos]       = useState({
    top: 0, left: 0,
  });

  useEffect(() => {
    setPhoto(
      storageKey
        ? (localStorage.getItem(storageKey) ?? null)
        : null
    );
  }, [storageKey]);

  // ── Close dropdown on outside click ──────────────────────────
  // Excludes both avatar div AND dropdown div
  useEffect(() => {
    if (!showOptions) return;
    function handleOutside(e) {
      const inAvatar = avatarRef.current?.contains(e.target);
      const inDropdown = dropdownRef.current?.contains(e.target);
      if (inAvatar || inDropdown) return;
      setShowOptions(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () =>
      document.removeEventListener('mousedown', handleOutside);
  }, [showOptions]);

  function openOptions() {
    if (avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setDropPos({
        top:  rect.bottom + 10,
        left: rect.left,
      });
    }
    setShowOptions(prev => !prev);
  }

  // ── CLICK FIRST then state — only way that works ──────────────
  function handleEditPhoto() {
    fileInputRef.current.click();
    setShowOptions(false);
  }

  function handleViewImage() {
    setShowOptions(false);
    setShowViewModal(true);
  }

  function handleRemovePhoto() {
    setShowOptions(false);
    setPhoto(null);
    if (storageKey) localStorage.removeItem(storageKey);
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setPhoto(base64);
      try {
        if (storageKey)
          localStorage.setItem(storageKey, base64);
      } catch {
        console.warn('Could not persist photo.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!user) return null;

  const initials = user.name
    ? user.name.trim().split(/\s+/)
        .map((w) => w[0]).join('')
        .toUpperCase().slice(0, 2)
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

      {/* ── View Image Modal ──────────────────────────────────── */}
      {showViewModal && photo && (
        <>
          <div
            onClick={() => setShowViewModal(false)}
            style={{
              position:        'fixed',
              inset:           0,
              backgroundColor: 'rgba(0,0,0,0.7)',
              zIndex:          2000,
            }}
          />
          <div style={{
            position:     'fixed',
            top:          '50%',
            left:         '50%',
            transform:    'translate(-50%, -50%)',
            zIndex:       2001,
            background:   '#ffffff',
            borderRadius: 16,
            boxShadow:    '0 24px 64px rgba(0,0,0,0.4)',
            overflow:     'hidden',
            maxWidth:     420,
            width:        '90%',
          }}>
            <div style={{
              background:
                'linear-gradient(135deg,' +
                '#667eea 0%, #764ba2 100%)',
              padding:        '14px 20px',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
            }}>
              <span style={{
                color:      '#ffffff',
                fontWeight: 700,
                fontSize:   15,
              }}>
                Profile Photo
              </span>
              <button
                onClick={() => setShowViewModal(false)}
                style={{
                  background:     'rgba(255,255,255,0.15)',
                  border:         'none',
                  borderRadius:   '50%',
                  width:          30, height: 30,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  cursor:         'pointer',
                  color:          '#ffffff',
                  fontSize:       14,
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div style={{ padding: 20 }}>
              <img
                src={photo}
                alt={user.name}
                style={{
                  width:        '100%',
                  borderRadius: 10,
                  objectFit:    'cover',
                  maxHeight:    360,
                }}
              />
              <div style={{
                marginTop:  12,
                textAlign:  'center',
                fontSize:   13,
                color:      '#9e9e9e',
              }}>
                {user.name}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Dropdown ─────────────────────────────────────────── */}
      {showOptions && (
        <div
          ref={dropdownRef}
          style={{
            position:     'fixed',
            top:          dropPos.top,
            left:         dropPos.left,
            zIndex:       1500,
            background:   '#ffffff',
            borderRadius: 12,
            boxShadow:    '0 8px 32px rgba(0,0,0,0.18)',
            border:       '1px solid #e9ecef',
            overflow:     'hidden',
            minWidth:     210,
          }}
        >
          <div style={{
            padding:       '10px 16px',
            background:    '#f8f9fa',
            borderBottom:  '1px solid #e9ecef',
            fontSize:      11,
            color:         '#9e9e9e',
            fontWeight:    600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            Profile Photo
          </div>

          {photo && (
            <button
              onClick={handleViewImage}
              style={menuItem()}
              onMouseEnter={(e) =>
                e.currentTarget.style.background = '#f3f4ff'}
              onMouseLeave={(e) =>
                e.currentTarget.style.background = '#ffffff'}
            >
              <span style={iconBox('#ede9fe')}>
                <i className="bi bi-eye-fill"
                  style={{ color: '#667eea', fontSize: 14 }}>
                </i>
              </span>
              <div>
                <div style={menuTitle()}>View Image</div>
                <div style={menuSub()}>
                  Preview your current photo
                </div>
              </div>
            </button>
          )}

          <button
            onClick={handleEditPhoto}
            style={menuItem(
              photo ? '1px solid #f0f0f0' : 'none'
            )}
            onMouseEnter={(e) =>
              e.currentTarget.style.background = '#f3f4ff'}
            onMouseLeave={(e) =>
              e.currentTarget.style.background = '#ffffff'}
          >
            <span style={iconBox('#ede9fe')}>
              <i className="bi bi-pencil-fill"
                style={{ color: '#667eea', fontSize: 13 }}>
              </i>
            </span>
            <div>
              <div style={menuTitle()}>
                {photo ? 'Edit Photo' : 'Upload Photo'}
              </div>
              <div style={menuSub()}>
                {photo
                  ? 'Replace with a new photo'
                  : 'Upload your profile photo'}
              </div>
            </div>
          </button>

          {photo && (
            <button
              onClick={handleRemovePhoto}
              style={menuItem('none')}
              onMouseEnter={(e) =>
                e.currentTarget.style.background = '#fff5f5'}
              onMouseLeave={(e) =>
                e.currentTarget.style.background = '#ffffff'}
            >
              <span style={iconBox('#fee2e2')}>
                <i className="bi bi-trash-fill"
                  style={{ color: '#ef4444', fontSize: 13 }}>
                </i>
              </span>
              <div>
                <div style={menuTitle('#ef4444')}>
                  Remove Photo
                </div>
                <div style={menuSub()}>
                  Revert to initials avatar
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* ── Back button ───────────────────────────────────────── */}
      <div className="mb-3 pt-1">
        <Button
          variant="link"
          onClick={() => navigate(-1)}
          className="p-0 text-decoration-none
            d-inline-flex align-items-center gap-1"
          style={{ color: '#667eea', fontWeight: 500 }}
        >
          <i className="bi bi-arrow-left-circle-fill"
            style={{ fontSize: 18 }}></i>
          &nbsp;Back
        </Button>
      </div>

      {/* ── Hero Card ─────────────────────────────────────────── */}
      <div
        className="rounded-4 overflow-hidden mb-4"
        style={{
          boxShadow: '0 4px 24px rgba(102,126,234,0.14)',
          border:    '1px solid rgba(102,126,234,0.1)',
        }}
      >
        <div style={{
          height:     130,
          background:
            'linear-gradient(135deg,' +
            '#667eea 0%, #764ba2 100%)',
          position:   'relative',
          overflow:   'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -30, right: -30,
            width: 160, height: 160, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }} />
          <div style={{
            position: 'absolute', bottom: -40, left: 180,
            width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }} />
          <div style={{
            position: 'absolute', top: 10, left: -20,
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }} />
        </div>

        <div className="bg-white px-3 px-md-4 pb-4">
          <div
            className="d-flex flex-wrap align-items-end gap-3"
            style={{ marginTop: -52 }}
          >
            {/* ── Avatar ───────────────────────────────────── */}
            <div
              ref={avatarRef}
              style={{ position: 'relative', flexShrink: 0 }}
            >
              <div
                onClick={openOptions}
                title="Photo options"
                style={{
                  width:          104,
                  height:         104,
                  borderRadius:   '50%',
                  border:         '4px solid white',
                  boxShadow:
                    '0 4px 20px rgba(102,126,234,0.3)',
                  overflow:       'hidden',
                  background:     photo
                    ? 'transparent'
                    : 'linear-gradient(135deg,' +
                      '#667eea 0%, #764ba2 100%)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  cursor:         'pointer',
                  userSelect:     'none',
                }}
              >
                {photo ? (
                  <img
                    src={photo}
                    alt={user.name}
                    style={{
                      width:     '100%',
                      height:    '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <span style={{
                    color:         'white',
                    fontSize:      36,
                    fontWeight:    700,
                    letterSpacing: 2,
                  }}>
                    {initials}
                  </span>
                )}
              </div>

              {/* Camera badge */}
              <button
                onClick={openOptions}
                title="Photo options"
                style={{
                  position:       'absolute',
                  bottom:         4, right: 0,
                  width:          30, height: 30,
                  borderRadius:   '50%',
                  background:
                    'linear-gradient(135deg,' +
                    '#667eea 0%, #764ba2 100%)',
                  border:         '3px solid white',
                  color:          'white',
                  fontSize:       12,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  cursor:         'pointer',
                  padding:        0,
                  boxShadow:
                    '0 2px 8px rgba(102,126,234,0.4)',
                }}
              >
                <i className="bi bi-camera-fill"></i>
              </button>

              {/* File input — inside avatarRef, stable ref */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
            </div>

            {/* ── Name + meta ───────────────────────────────── */}
            <div style={{
              paddingBottom: 4,
              paddingTop:    54,
              flex:          1,
            }}>
              <div className="d-flex align-items-center
                flex-wrap gap-2 mb-1">
                <h4 className="fw-bold mb-0"
                  style={{ color: '#1e1b4b' }}>
                  {user.name}
                </h4>
                <Badge
                  className="rounded-pill"
                  style={{
                    background: roleColor,
                    fontSize:   11,
                    padding:    '4px 10px',
                  }}
                >
                  <i className={`bi ${roleIcon} me-1`}></i>
                  {user.role === 'InsuranceStaff'
                    ? 'Staff' : user.role}
                </Badge>
                {user.mfaEnabled && (
                  <Badge bg="success"
                    className="rounded-pill"
                    style={{ fontSize: 10,
                      padding: '3px 8px' }}>
                    <i className="bi bi-shield-check me-1">
                    </i>MFA On
                  </Badge>
                )}
              </div>

              <div
                className="d-flex flex-wrap gap-3 text-muted"
                style={{ fontSize: 13 }}
              >
                <span>
                  <i className="bi bi-envelope me-1"></i>
                  {user.email}
                </span>
                {user.phone && (
                  <span>
                    <i className="bi bi-telephone me-1"></i>
                    {user.phone}
                  </span>
                )}
                {user.department && (
                  <span>
                    <i className="bi bi-building me-1"></i>
                    {user.department}
                  </span>
                )}
                <span>
                  <i className="bi bi-calendar3 me-1"></i>
                  Joined {joined}
                </span>
                {user.organizationName && (
                  <span>
                    <i className="bi bi-bank me-1"></i>
                    {user.organizationName}
                  </span>
                )}
              </div>
            </div>

            <div
              className="d-none d-lg-flex
                align-items-center gap-1 pb-2"
              style={{ color: '#c4b5fd', fontSize: 12 }}
            >
              <i className="bi bi-camera me-1"></i>
              Click the photo to update
            </div>
          </div>
        </div>
      </div>

      {/* ── Section title ─────────────────────────────────────── */}
      <div className="mb-3">
        <h5 className="fw-bold mb-0"
          style={{ color: '#1e1b4b' }}>
          <i className="bi bi-gear-fill me-2"
            style={{ color: '#667eea' }}></i>
          Account Settings
        </h5>
        <small className="text-muted">
          Manage your profile details and security preferences
        </small>
      </div>

      {/* ── Cards Grid ────────────────────────────────────────── */}
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

function menuItem(borderTop = 'none') {
  return {
    width:      '100%',
    padding:    '10px 16px',
    border:     'none',
    borderTop:  borderTop,
    background: '#ffffff',
    textAlign:  'left',
    cursor:     'pointer',
    display:    'flex',
    alignItems: 'center',
    gap:        12,
    transition: 'background 0.15s',
  };
}

function iconBox(bg) {
  return {
    width:          32, height: 32,
    borderRadius:   8,
    background:     bg,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  };
}

function menuTitle(color = '#1e2a3a') {
  return {
    fontSize:   13,
    fontWeight: 600,
    color:      color,
  };
}

function menuSub() {
  return {
    fontSize: 11,
    color:    '#9e9e9e',
  };
}