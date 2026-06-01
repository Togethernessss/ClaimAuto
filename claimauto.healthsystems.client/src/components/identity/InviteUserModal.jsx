import { useState, useEffect } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { inviteUser } from '../../services/identity/authService';
import { useAuth } from '../../security/AuthContext';

const ROLE_META = {
  Admin:          { icon: 'bi-shield-fill-check',   color: '#ef4444', bg: '#fee2e2', label: 'Admin' },
  InsuranceStaff: { icon: 'bi-person-badge-fill',   color: '#f59e0b', bg: '#fef3c7', label: 'Insurance Staff' },
  Hospital:       { icon: 'bi-hospital',             color: '#3b82f6', bg: '#dbeafe', label: 'Hospital' },
  Policyholder:   { icon: 'bi-person-fill-check',   color: '#10b981', bg: '#d1fae5', label: 'Policyholder' },
};

function FieldBox({ icon, label, required, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: '0.78rem', fontWeight: 700,
        color: '#4c1d95', marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        <i className={`bi ${icon}`} style={{ fontSize: 11 }}></i>
        {label}
        {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 4 }}>
          <i className="bi bi-info-circle me-1"></i>{hint}
        </div>
      )}
    </div>
  );
}

export default function InviteUserModal({ show, onClose, onInvited }) {
  const { user }   = useAuth();
  const orgName    = user?.organizationName;
  const brandColor = user?.organizationBrandColor || '#667eea';

  // ── Form fields ──────────────────────────────────────────────────
  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [role,       setRole]       = useState('InsuranceStaff');
  const [phone,      setPhone]      = useState('');
  const [department, setDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);
  const [success,    setSuccess]    = useState(false);

  // ── Email validation state ────────────────────────────────────────
  const [emailError,   setEmailError]   = useState(null);
  const [emailTouched, setEmailTouched] = useState(false);

  // ── Phone validation state ────────────────────────────────────────
  const [phoneError,   setPhoneError]   = useState(null);
  const [phoneTouched, setPhoneTouched] = useState(false);

  // ── Reset everything when modal opens ────────────────────────────
  useEffect(() => {
    if (show) {
      setName(''); setEmail(''); setRole('InsuranceStaff');
      setPhone(''); setDepartment('');
      setError(null); setSuccess(false); setSubmitting(false);
      setEmailError(null); setEmailTouched(false);
      setPhoneError(null); setPhoneTouched(false);
    }
  }, [show]);

  // ── Email validation ──────────────────────────────────────────────
  const validateEmail = (value) => {
    const v = value.trim();
    if (!v) return 'Email address is required.';
    if (v.length > 254) return 'Email address is too long (max 254 characters).';
    if (v.includes(' ')) return 'Email address must not contain spaces.';
    const atIndex = v.indexOf('@');
    if (atIndex === -1) return 'Must include an "@" symbol.';
    if (v.lastIndexOf('@') !== atIndex) return 'Must have exactly one "@" symbol.';
    const local  = v.slice(0, atIndex);
    const domain = v.slice(atIndex + 1);
    if (!local)              return 'Please enter the part before "@".';
    if (local.length > 64)   return 'Part before "@" is too long (max 64 chars).';
    if (!domain)             return 'Please enter the domain after "@".';
    if (!domain.includes('.')) return 'Domain must include a "." (e.g. gmail.com).';
    const parts = domain.split('.');
    if (parts.some((p) => p === '')) return 'Domain cannot have consecutive or trailing dots.';
    const tld = parts[parts.length - 1];
    if (tld.length < 2) return 'Domain extension must be at least 2 characters.';
    return null;
  };

  // ── Phone validation ──────────────────────────────────────────────
  const validatePhone = (value) => {
    const digits = value.replace(/[\s\-().+]/g, '');
    if (digits === '') return null;
    if (!/^\d+$/.test(digits)) return 'Must contain only digits.';
    if (digits.length !== 10)  return `Must be exactly 10 digits (you entered ${digits.length}).`;
    if (!/^[6-9]/.test(digits)) return 'Must start with 6, 7, 8, or 9.';
    return null;
  };

  const handleEmailChange = (e) => {
    const raw = e.target.value;
    setEmail(raw);
    if (emailTouched) setEmailError(validateEmail(raw));
  };
  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmail(email));
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    setPhone(raw);
    if (phoneTouched) setPhoneError(validatePhone(raw));
  };
  const handlePhoneBlur = () => {
    setPhoneTouched(true);
    setPhoneError(validatePhone(phone));
  };

  const emailOk   = !validateEmail(email);
  const phoneOk   = !validatePhone(phone);
  const canSubmit = name.trim() && emailOk && phoneOk && role && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phone);
    setEmailTouched(true);  setEmailError(emailErr);
    setPhoneTouched(true);  setPhoneError(phoneErr);
    if (!name.trim()) { setError('Full name is required.'); return; }
    if (emailErr)     { setError('Please enter a valid email address.'); return; }
    if (phoneErr)     { setError('Please fix the phone number before sending.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      await inviteUser({ name, email, role, phone: phone || null, department: department || null });
      setSuccess(true);
      if (onInvited) onInvited();
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data || 'Failed to send invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRole = ROLE_META[role] || ROLE_META.InsuranceStaff;

  const inputStyle = (hasError, isValid) => ({
    width: '100%',
    padding: '9px 12px',
    border: `1.5px solid ${hasError ? '#ef4444' : isValid ? '#10b981' : '#e5e7eb'}`,
    borderRadius: 10,
    fontSize: '0.85rem',
    outline: 'none',
    background: hasError ? '#fff5f5' : isValid ? '#f0fdf4' : '#f9fafb',
    color: '#1e1b4b',
    transition: 'border-color 0.15s, background 0.15s',
    boxSizing: 'border-box',
  });

  return (
    <Modal show={show} onHide={onClose} centered backdrop="static">
      {/* ── Gradient Header ──────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px 12px 0 0',
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* orbs */}
        <div style={{ position:'absolute', width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,0.06)', top:-50, right:-30, pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.04)', bottom:-20, left:40, pointerEvents:'none' }} />

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:46, height:46, borderRadius:12,
              background:'rgba(255,255,255,0.18)',
              display:'flex', alignItems:'center', justifyContent:'center',
              backdropFilter:'blur(8px)', flexShrink:0,
            }}>
              <i className="bi bi-envelope-plus" style={{ fontSize:'1.3rem', color:'white' }}></i>
            </div>
            <div>
              <div style={{ color:'white', fontWeight:800, fontSize:'1.1rem' }}>Invite New User</div>
              <div style={{ color:'rgba(255,255,255,0.72)', fontSize:'0.75rem' }}>Send a temporary-password invitation</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8,
            width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'white', fontSize:16,
          }}>✕</button>
        </div>
      </div>

      <Modal.Body style={{ padding:'22px 24px 8px', background:'white' }}>

        {/* ── Org context strip ─────────────────────────────────── */}
        {orgName && (
          <div style={{
            display:'flex', alignItems:'center', gap:8,
            background:`${brandColor}12`,
            border:`1.5px solid ${brandColor}35`,
            borderRadius:10, padding:'9px 14px', marginBottom:18,
          }}>
            <span style={{ width:10, height:10, borderRadius:'50%', background:brandColor, flexShrink:0, display:'inline-block', boxShadow:`0 0 6px ${brandColor}80` }} />
            <span style={{ fontSize:'0.82rem', color:'#4b5563' }}>
              Inviting to <strong style={{ color:brandColor }}>{orgName}</strong>
            </span>
          </div>
        )}

        {/* ── Success ───────────────────────────────────────────── */}
        {success && (
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            background:'#f0fdf4', border:'1.5px solid #bbf7d0',
            borderRadius:10, padding:'12px 16px', marginBottom:16,
          }}>
            <i className="bi bi-check-circle-fill" style={{ color:'#16a34a', fontSize:16 }}></i>
            <span style={{ color:'#15803d', fontSize:'0.85rem', fontWeight:600 }}>
              Invitation sent! User will receive an email with their temp password.
            </span>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────── */}
        {error && (
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            background:'#fff5f5', border:'1.5px solid #fca5a5',
            borderRadius:10, padding:'12px 16px', marginBottom:16,
          }}>
            <i className="bi bi-exclamation-triangle-fill" style={{ color:'#dc2626', fontSize:16, flexShrink:0 }}></i>
            <span style={{ color:'#dc2626', fontSize:'0.85rem' }}>{typeof error === 'string' ? error : 'Failed to send invitation.'}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Full Name ─────────────────────────────────────────── */}
          <FieldBox icon="bi-person-fill" label="Full Name" required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
              style={inputStyle(false, name.trim().length > 0)}
            />
          </FieldBox>

          {/* ── Email ─────────────────────────────────────────────── */}
          <FieldBox icon="bi-envelope-fill" label="Email Address" required>
            <div style={{ position:'relative' }}>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                maxLength={254}
                placeholder="jane@example.com"
                required
                style={inputStyle(emailTouched && !!emailError, emailTouched && !emailError && !!email)}
              />
              {emailTouched && !emailError && email && (
                <i className="bi bi-check-circle-fill" style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#10b981', fontSize:14 }}></i>
              )}
            </div>
            {emailTouched && emailError && (
              <div style={{ fontSize:'0.72rem', color:'#dc2626', marginTop:4 }}>
                <i className="bi bi-exclamation-circle me-1"></i>{emailError}
              </div>
            )}
            {emailTouched && !emailError && email && (
              <div style={{ fontSize:'0.72rem', color:'#16a34a', marginTop:4 }}>
                <i className="bi bi-check-circle me-1"></i>Looks good!
              </div>
            )}
          </FieldBox>

          {/* ── Role ──────────────────────────────────────────────── */}
          <FieldBox icon="bi-person-badge-fill" label="Role" required>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {Object.entries(ROLE_META).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRole(key)}
                  style={{
                    flex:'1 1 calc(50% - 4px)',
                    padding:'9px 12px',
                    borderRadius:10,
                    border: role === key ? `2px solid ${meta.color}` : '1.5px solid #e5e7eb',
                    background: role === key ? meta.bg : '#f9fafb',
                    color: role === key ? meta.color : '#6b7280',
                    fontWeight: role === key ? 700 : 500,
                    fontSize:'0.8rem',
                    cursor:'pointer',
                    display:'flex', alignItems:'center', gap:7,
                    transition:'all 0.15s',
                  }}
                >
                  <i className={`bi ${meta.icon}`} style={{ fontSize:13 }}></i>
                  {meta.label}
                  {role === key && <i className="bi bi-check-circle-fill ms-auto" style={{ fontSize:12 }}></i>}
                </button>
              ))}
            </div>
          </FieldBox>

          {/* ── Phone + Department ────────────────────────────────── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

            {/* Phone */}
            <FieldBox icon="bi-telephone-fill" label="Phone" hint="10-digit Indian mobile, starting with 6–9">
              <div style={{ display:'flex' }}>
                <div style={{
                  padding:'9px 10px',
                  background:'#f5f3ff', color:'#7c3aed',
                  border:'1.5px solid #a78bfa', borderRight:'none',
                  borderRadius:'10px 0 0 10px',
                  fontSize:'0.82rem', fontWeight:700, flexShrink:0,
                  display:'flex', alignItems:'center',
                }}>+91</div>
                <div style={{ flex:1, position:'relative' }}>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    onBlur={handlePhoneBlur}
                    maxLength={15}
                    placeholder="98765 43210"
                    style={{
                      ...inputStyle(phoneTouched && !!phoneError, phoneTouched && !phoneError && phone.trim() !== ''),
                      borderRadius:'0 10px 10px 0',
                      borderLeft:'none',
                      width:'100%',
                    }}
                  />
                </div>
              </div>
              {phoneTouched && phoneError && (
                <div style={{ fontSize:'0.72rem', color:'#dc2626', marginTop:4 }}>
                  <i className="bi bi-exclamation-circle me-1"></i>{phoneError}
                </div>
              )}
              {phoneTouched && !phoneError && phone.trim() && (
                <div style={{ fontSize:'0.72rem', color:'#16a34a', marginTop:4 }}>
                  <i className="bi bi-check-circle me-1"></i>Looks good!
                </div>
              )}
            </FieldBox>

            {/* Department */}
            <FieldBox icon="bi-building-fill" label="Department">
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Optional"
                style={inputStyle(false, false)}
              />
            </FieldBox>
          </div>

          {/* ── Info note ─────────────────────────────────────────── */}
          <div style={{
            display:'flex', alignItems:'flex-start', gap:10,
            background:'linear-gradient(135deg, #eff6ff, #f5f3ff)',
            border:'1px solid #bfdbfe',
            borderRadius:10, padding:'11px 14px', marginBottom:4,
          }}>
            <i className="bi bi-info-circle-fill" style={{ color:'#3b82f6', fontSize:14, marginTop:1, flexShrink:0 }}></i>
            <span style={{ fontSize:'0.8rem', color:'#1e40af' }}>
              A temporary password will be emailed to the user. They will be required to change it on first login.
            </span>
          </div>

        </form>
      </Modal.Body>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10,
        padding:'14px 24px 20px', background:'white', borderRadius:'0 0 12px 12px',
        borderTop:'1px solid #f3f0ff',
      }}>
        <button onClick={onClose} disabled={submitting} style={{
          padding:'9px 20px', borderRadius:10,
          border:'1.5px solid #e5e7eb', background:'white',
          color:'#6b7280', fontWeight:600, fontSize:'0.85rem',
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}>
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            padding:'9px 22px', borderRadius:10, border:'none',
            background: canSubmit
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : '#e5e7eb',
            color: canSubmit ? 'white' : '#9ca3af',
            fontWeight:700, fontSize:'0.85rem',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            display:'flex', alignItems:'center', gap:7,
            boxShadow: canSubmit ? '0 4px 12px rgba(102,126,234,0.35)' : 'none',
            transition:'all 0.15s',
          }}
        >
          {submitting ? (
            <><Spinner animation="border" size="sm" style={{ width:14, height:14 }} /> Sending...</>
          ) : (
            <><i className="bi bi-send-fill"></i> Send Invitation</>
          )}
        </button>
      </div>
    </Modal>
  );
}
