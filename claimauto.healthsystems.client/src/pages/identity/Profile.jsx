import { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Button, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import { getMyMemberEnrollments } from '../../services/members/memberService';
import { updateProfilePhoto, removeProfilePhoto } from '../../services/identity/userService';
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
  const { user, updateUser } = useAuth();
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);
  const avatarRef    = useRef(null);
  const dropdownRef  = useRef(null);

  const storageKey = user?.userID
    ? `profilePhoto_${user.userID}` : null;

  // Source of truth: AuthContext user.profilePhoto (backend-persisted).
  // localStorage is kept only as a fast-paint cache for the very first render
  // before /me has returned.
  const [photo,         setPhoto]         = useState(() =>
    user?.profilePhoto
      ?? (storageKey ? localStorage.getItem(storageKey) : null)
      ?? null
  );
  const [photoSaving,   setPhotoSaving]   = useState(false);
  const [showOptions,   setShowOptions]   = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [dropPos,       setDropPos]       = useState({
    top: 0, left: 0,
  });

  // ── Policyholder Insurance Member Card state ──────────────────
  const [myMember,      setMyMember]      = useState(null);
  const [myMembers,     setMyMembers]     = useState([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError,   setMemberError]   = useState(null);
  const [copiedMember,  setCopiedMember]  = useState(false);

  // Re-sync local preview state when the backend user.profilePhoto changes
  // (e.g. after a fresh /me poll or a different user logs in).
  useEffect(() => {
    setPhoto(
      user?.profilePhoto
        ?? (storageKey ? localStorage.getItem(storageKey) : null)
        ?? null
    );
  }, [user?.profilePhoto, storageKey]);

  // ── Fetch insurance member record (Policyholder only) ─────────
  useEffect(() => {
    if (user?.role !== 'Policyholder') return;
    setMemberLoading(true);
    getMyMemberEnrollments()
      .then((data) => {
        const enrollments = Array.isArray(data) ? data : [];
        setMyMembers(enrollments);
        setMyMember(enrollments[0] ?? null);
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setMyMembers([]);
          setMyMember(null); // not enrolled yet - not an error
        } else {
          setMemberError('Could not load insurance details.');
        }
      })
      .finally(() => setMemberLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  function copyMemberNumber() {
    if (!myMember?.memberNumber) return;
    navigator.clipboard.writeText(myMember.memberNumber)
      .then(() => {
        setCopiedMember(true);
        setTimeout(() => setCopiedMember(false), 2000);
      })
      .catch(() => {});
  }

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

  async function handleRemovePhoto() {
    setShowOptions(false);
    if (!user?.userID) return;
    setPhotoSaving(true);
    try {
      await removeProfilePhoto(user.userID);
      setPhoto(null);
      updateUser({ profilePhoto: null });
      if (storageKey) localStorage.removeItem(storageKey);
    } catch (err) {
      console.error('Failed to remove photo:', err);
      alert('Could not remove photo. Please try again.');
    } finally {
      setPhotoSaving(false);
    }
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
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      // Optimistic UI: show immediately while POST is in flight.
      setPhoto(base64);
      setPhotoSaving(true);
      try {
        const updated = await updateProfilePhoto(user.userID, base64);
        const saved = updated?.profilePhoto ?? base64;
        updateUser({ profilePhoto: saved });
        try {
          if (storageKey) localStorage.setItem(storageKey, saved);
        } catch { /* localStorage quota — non-fatal, server is the source */ }
      } catch (err) {
        console.error('Failed to save photo:', err);
        // Rollback the optimistic preview to whatever the server has.
        setPhoto(user?.profilePhoto ?? null);
        alert('Could not save photo. Please try again.');
      } finally {
        setPhotoSaving(false);
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
    ? new Date((user.createdAt && !user.createdAt.endsWith('Z') ? user.createdAt + 'Z' : user.createdAt)).toLocaleDateString(undefined, {
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

      {/* ── Insurance Member Card (Policyholder only) ─────────── */}
      {user.role === 'Policyholder' && (
        <div className="mb-4">
          {/* Section label */}
          <div className="mb-3">
            <h5 className="fw-bold mb-0" style={{ color: '#1e1b4b' }}>
              <i className="bi bi-credit-card-2-front-fill me-2"
                style={{ color: '#667eea' }}></i>
              Insurance Member Card
            </h5>
            <small className="text-muted">
              Your digital health insurance ID — share your Member ID when visiting a hospital
            </small>
          </div>

          {/* Loading */}
          {memberLoading && (
            <div
              className="text-center py-4 rounded-4"
              style={{ background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
            >
              <Spinner animation="border" size="sm" style={{ color: '#667eea' }} />
              <div className="mt-2 small text-muted">Loading your insurance details…</div>
            </div>
          )}

          {/* Error */}
          {!memberLoading && memberError && (
            <div
              className="p-4 rounded-4 d-flex align-items-center gap-2"
              style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
            >
              <i className="bi bi-exclamation-triangle-fill"
                style={{ color: '#dc2626', fontSize: 18 }}></i>
              <span style={{ color: '#991b1b', fontSize: 14 }}>{memberError}</span>
            </div>
          )}

          {/* Not yet enrolled */}
          {!memberLoading && !memberError && !myMember && (
            <div
              className="text-center py-5 rounded-4"
              style={{
                background: 'white',
                border: '2px dashed #e5e7eb',
                boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ fontSize: 44, color: '#c4b5fd', marginBottom: 12 }}>
                <i className="bi bi-credit-card"></i>
              </div>
              <div className="fw-semibold" style={{ color: '#4c1d95', fontSize: 15 }}>
                Not yet enrolled
              </div>
              <div className="text-muted small mt-1">
                Your insurance staff hasn&apos;t enrolled you under a policy yet.<br />
                Contact your insurance provider to receive your Member ID.
              </div>
            </div>
          )}

          {/* Insurance card */}
          {!memberLoading && !memberError && myMember && (
            <div
              style={{
                borderRadius: 20,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '24px 28px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(102,126,234,0.38)',
                maxWidth: 720,
              }}
            >
              {/* Decorative orbs */}
              <div style={{
                position: 'absolute', width: 220, height: 220,
                borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                top: -70, right: -50, pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', width: 130, height: 130,
                borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
                bottom: -40, left: '55%', pointerEvents: 'none',
              }} />

              {/* ── Top row: chip + org + status badge ────────── */}
              <div
                className="d-flex align-items-start justify-content-between mb-4"
                style={{ position: 'relative' }}
              >
                <div className="d-flex align-items-center gap-2">
                  {/* SIM chip visual */}
                  <div style={{
                    width: 36, height: 28, borderRadius: 5,
                    background: 'rgba(255,255,255,0.22)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    flexShrink: 0,
                  }} />
                  <div>
                    <div style={{
                      color: 'rgba(255,255,255,0.65)',
                      fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.9px',
                    }}>
                      {user.organizationName || 'ClaimAuto Health'}
                    </div>
                    <div style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>
                      Health Insurance
                    </div>
                  </div>
                </div>

                {/* Status pill */}
                <div style={{
                  background: myMember.status === 'Active'
                    ? 'rgba(16,185,129,0.22)' : 'rgba(239,68,68,0.22)',
                  border: `1px solid ${myMember.status === 'Active'
                    ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.45)'}`,
                  borderRadius: 20, padding: '3px 11px',
                  fontSize: 11, fontWeight: 700,
                  color: myMember.status === 'Active' ? '#6ee7b7' : '#fca5a5',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <i className={`bi ${myMember.status === 'Active'
                    ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i>
                  {myMember.status}
                </div>
              </div>

              {/* ── Member name ───────────────────────────────── */}
              <div style={{ position: 'relative', marginBottom: 18 }}>
                <div style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 3,
                }}>
                  Insured Member
                </div>
                <div style={{ color: 'white', fontSize: 20, fontWeight: 700, letterSpacing: '0.3px' }}>
                  {myMember.name}
                </div>
              </div>

              {/* ── Member ID number ──────────────────────────── */}
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <div style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 8,
                }}>
                  Member ID Number
                </div>
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <span style={{
                    color: 'white', fontSize: 22, fontWeight: 800,
                    letterSpacing: '2.5px', fontFamily: 'monospace',
                  }}>
                    {myMember.memberNumber}
                  </span>
                  <button
                    onClick={copyMemberNumber}
                    title="Copy member number to clipboard"
                    style={{
                      background: copiedMember
                        ? 'rgba(16,185,129,0.28)' : 'rgba(255,255,255,0.18)',
                      border: `1px solid ${copiedMember
                        ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.3)'}`,
                      borderRadius: 8, color: 'white',
                      fontSize: 12, fontWeight: 600,
                      padding: '5px 14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                      transition: 'all 0.2s', backdropFilter: 'blur(4px)',
                    }}
                    onMouseEnter={(e) => {
                      if (!copiedMember)
                        e.currentTarget.style.background = 'rgba(255,255,255,0.28)';
                    }}
                    onMouseLeave={(e) => {
                      if (!copiedMember)
                        e.currentTarget.style.background = 'rgba(255,255,255,0.18)';
                    }}
                  >
                    <i className={`bi ${copiedMember ? 'bi-check2' : 'bi-clipboard'}`}></i>
                    {copiedMember ? 'Copied!' : 'Copy ID'}
                  </button>
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.48)', fontSize: 11, marginTop: 7,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <i className="bi bi-info-circle"></i>
                  Share this ID with your hospital when seeking treatment
                </div>
              </div>

              {/* ── Bottom row: policy + coverage ─────────────── */}
              <div style={{
                position: 'relative',
                borderTop: '1px solid rgba(255,255,255,0.18)',
                paddingTop: 16,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
              }}>
                <div>
                  <div style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 4,
                  }}>
                    Policy Plan
                  </div>
                  <div style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>
                    {myMembers.length > 1
                      ? `${myMembers.length} linked policies`
                      : (myMember.policyName || '-')}
                  </div>
                </div>
                <div>
                  <div style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: 4,
                  }}>
                    Coverage Period
                  </div>
                  <div style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>
                    {fmtCardDate(myMember.coverageStart)}
                    {' — '}
                    {fmtCardDate(myMember.coverageEnd)}
                  </div>
                </div>
              </div>
              {myMembers.length > 1 && (
                <div
                  style={{
                    marginTop: 14,
                    borderTop: '1px solid rgba(255,255,255,0.14)',
                    paddingTop: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {myMembers.map((enrollment) => (
                    <div
                      key={enrollment.memberID}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <span style={{
                        color: 'rgba(255,255,255,0.86)',
                        fontSize: 12,
                        fontWeight: 700,
                      }}>
                        {enrollment.policyName || 'Policy'}
                      </span>
                      <span style={{
                        color: 'rgba(255,255,255,0.62)',
                        fontSize: 11,
                        whiteSpace: 'nowrap',
                      }}>
                        {fmtCardDate(enrollment.coverageStart)}
                        {' - '}
                        {fmtCardDate(enrollment.coverageEnd)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {/* ── Multi-enrollment info note ───────────── */}
              <div style={{
                marginTop: 14,
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '8px 12px',
              }}>
                <i className="bi bi-info-circle-fill" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 1, flexShrink: 0 }}></i>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                  The same Member ID is used across your linked policy enrollments. Check the <strong style={{ color: 'rgba(255,255,255,0.9)' }}>Policies</strong> page for full coverage details.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

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
      {/* Row 1: Profile info alongside Security Overview — balanced heights */}
      <Row className="g-4">
        <Col lg={7}>
          <ProfileInfoCard user={user} />
        </Col>
        <Col lg={5}>
          <SecurityOverviewCard user={user} />
        </Col>
      </Row>

      {/* Row 2: Three security-action cards in equal columns */}
      <Row className="g-4 mt-0">
        <Col md={4}>
          <ChangePasswordCard />
        </Col>
        <Col md={4}>
          <MfaCard user={user} />
        </Col>
        <Col md={4}>
          <AccountInfoCard user={user} />
        </Col>
      </Row>

    </Container>
  );
}

// ── Formats an ISO date string as "Jan 2024" for the insurance card ──
function fmtCardDate(iso) {
  if (!iso) return '—';
  const utcIso = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; return new Date(utcIso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short',
  });
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
