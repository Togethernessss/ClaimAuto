import { useState, useEffect, useRef } from 'react';
import { Modal, Spinner }              from 'react-bootstrap';

// ── Reusable styled field label ───────────────────────────────────────────────
function FieldLabel({ icon, label, required, hint, locked }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: '0.75rem', fontWeight: 700,
        color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        <i className={`bi ${icon}`} style={{ fontSize: 10 }}></i>
        {label}
        {required && <span style={{ color: '#ef4444' }}>*</span>}
        {locked && (
          <span style={{
            marginLeft: 4, fontSize: '0.62rem', fontWeight: 600,
            background: '#f3f4f6', color: '#9ca3af',
            padding: '1px 6px', borderRadius: 20, letterSpacing: 0,
          }}>locked after enroll</span>
        )}
      </label>
      {hint && (
        <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
          <i className="bi bi-info-circle me-1"></i>{hint}
        </div>
      )}
    </div>
  );
}

const inputCls = {
  width: '100%', padding: '9px 12px',
  border: '1.5px solid #e5e7eb', borderRadius: 10,
  fontSize: '0.85rem', color: '#1e1b4b',
  background: '#f9fafb', outline: 'none',
  transition: 'border-color 0.15s, background 0.15s',
  boxSizing: 'border-box',
};

export default function CreateModal({
  show,
  loading,
  error,
  form,
  policies,
  policyholderUsers,
  existingMembers,
  onHide,
  onFieldChange,
  onUserSelect,
  onSubmit,
}) {
  const [userSearch, setUserSearch] = useState('');
  const [isOpen,     setIsOpen]     = useState(false);
  const dropdownRef                  = useRef(null);

  // Reset dropdown when modal closes
  useEffect(() => {
    if (!show) { setIsOpen(false); setUserSearch(''); }
  }, [show]);

  // Close on outside click
  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isOpen]);

  const filteredUsers = (policyholderUsers || []).filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const selectedUser = (policyholderUsers || []).find(
    (u) => String(u.userID) === String(form.policyholderUserID)
  );

  const selectedPolicy = (policies || []).find(
    (p) => String(p.policyID) === String(form.policyID)
  );
  const policyMax = selectedPolicy?.effectiveTo
    ? selectedPolicy.effectiveTo.split('T')[0]
    : undefined;

  const isDuplicateEnrollment =
    form.policyholderUserID && form.policyID &&
    (existingMembers || []).some(m =>
      String(m.policyholderUserID) === String(form.policyholderUserID) &&
      String(m.policyID)           === String(form.policyID) &&
      (m.status === 'Active' || m.status === undefined)
    );

  // ── Initials helper for avatar ──────────────────────────────────
  function initials(name = '') {
    return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static">

      {/* ── Gradient Header ──────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px 12px 0 0',
        padding: '20px 26px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.06)', top:-60, right:-30, pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:90, height:90, borderRadius:'50%', background:'rgba(255,255,255,0.04)', bottom:-30, left:60, pointerEvents:'none' }} />

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:48, height:48, borderRadius:13,
              background:'rgba(255,255,255,0.18)',
              display:'flex', alignItems:'center', justifyContent:'center',
              backdropFilter:'blur(8px)', flexShrink:0,
            }}>
              <i className="bi bi-person-plus-fill" style={{ fontSize:'1.35rem', color:'white' }}></i>
            </div>
            <div>
              <div style={{ color:'white', fontWeight:800, fontSize:'1.1rem' }}>Enroll New Member</div>
              <div style={{ color:'rgba(255,255,255,0.72)', fontSize:'0.75rem' }}>Link a policyholder to a policy plan</div>
            </div>
          </div>
          <button onClick={onHide} style={{
            background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8,
            width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'white', fontSize:16,
          }}>✕</button>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div style={{ overflowY:'auto', maxHeight:'68vh', padding:'22px 26px 8px', background:'white' }}>

          {/* ── API Error ─────────────────────────────────────────── */}
          {error && (
            <div style={{
              display:'flex', alignItems:'center', gap:10,
              background:'#fff5f5', border:'1.5px solid #fca5a5',
              borderRadius:10, padding:'11px 14px', marginBottom:16,
            }}>
              <i className="bi bi-exclamation-triangle-fill" style={{ color:'#dc2626', fontSize:14, flexShrink:0 }}></i>
              <span style={{ color:'#dc2626', fontSize:'0.83rem' }}>{error}</span>
            </div>
          )}

          {/* ── Duplicate enrollment warning ─────────────────────── */}
          {isDuplicateEnrollment && (
            <div style={{
              display:'flex', alignItems:'flex-start', gap:10,
              background:'#fffbeb', border:'1.5px solid #fde68a',
              borderRadius:10, padding:'11px 14px', marginBottom:16,
            }}>
              <i className="bi bi-exclamation-circle-fill" style={{ color:'#d97706', fontSize:14, marginTop:1, flexShrink:0 }}></i>
              <span style={{ color:'#92400e', fontSize:'0.83rem' }}>
                This policyholder is already enrolled in the selected policy. Pick a different policy or update the existing enrollment.
              </span>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
              SECTION 1 — Enrollment setup
          ════════════════════════════════════════════════════════ */}
          <div style={{
            background:'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
            border:'1px solid #ddd6fe', borderRadius:12,
            padding:'14px 16px', marginBottom:18,
          }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>
              <i className="bi bi-link-45deg me-1"></i>Enrollment Setup
            </div>

            {/* ── Policyholder User ─────────────────────────────── */}
            <div style={{ marginBottom:14 }}>
              <FieldLabel icon="bi-person-circle" label="Link to Registered User" required
                hint="The member record will be linked to this user's account." />

              <div ref={dropdownRef} style={{ position:'relative' }}>
                {/* Trigger button */}
                <div
                  onClick={() => setIsOpen((o) => !o)}
                  style={{
                    ...inputCls,
                    cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    border: isOpen ? '1.5px solid #a78bfa' : '1.5px solid #e5e7eb',
                    background: isOpen ? '#faf5ff' : '#f9fafb',
                    minHeight: 42,
                  }}
                >
                  {selectedUser ? (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{
                        width:28, height:28, borderRadius:'50%', flexShrink:0,
                        background:'linear-gradient(135deg, #667eea, #764ba2)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:11, fontWeight:700, color:'white',
                      }}>{initials(selectedUser.name)}</div>
                      <div>
                        <div style={{ fontSize:'0.85rem', fontWeight:700, color:'#1e1b4b' }}>{selectedUser.name}</div>
                        <div style={{ fontSize:'0.7rem', color:'#9ca3af' }}>{selectedUser.email}</div>
                      </div>
                    </div>
                  ) : (
                    <span style={{ color:'#9ca3af', fontSize:'0.85rem' }}>— Select a Policyholder user —</span>
                  )}
                  <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`} style={{ color:'#9ca3af', fontSize:11 }} />
                </div>

                {/* Dropdown panel */}
                {isOpen && (
                  <div style={{
                    position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:1050,
                    background:'white', border:'1.5px solid #ddd6fe',
                    borderRadius:12, boxShadow:'0 8px 24px rgba(102,126,234,0.18)',
                  }}>
                    <div style={{ padding:'10px 12px', borderBottom:'1px solid #f3f0ff' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f9fafb', borderRadius:8, padding:'7px 10px', border:'1px solid #e5e7eb' }}>
                        <i className="bi bi-search" style={{ color:'#9ca3af', fontSize:12 }}></i>
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search by name or email..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          style={{ border:'none', outline:'none', background:'transparent', fontSize:'0.82rem', color:'#1e1b4b', flex:1 }}
                        />
                      </div>
                    </div>
                    <div style={{ maxHeight:200, overflowY:'auto' }}>
                      {filteredUsers.length === 0 ? (
                        <div style={{ padding:'16px', textAlign:'center', color:'#9ca3af', fontSize:'0.82rem' }}>
                          <i className="bi bi-search me-1"></i>
                          {userSearch ? 'No users match your search' : 'No registered Policyholder users found'}
                        </div>
                      ) : filteredUsers.map((u) => {
                        const isSel = String(form.policyholderUserID) === String(u.userID);
                        return (
                          <div
                            key={u.userID}
                            onClick={() => { onUserSelect(u); setIsOpen(false); setUserSearch(''); }}
                            style={{
                              display:'flex', alignItems:'center', gap:10,
                              padding:'10px 14px', cursor:'pointer',
                              background: isSel ? '#f5f3ff' : 'white',
                              borderBottom:'1px solid #f9fafb',
                              transition:'background 0.1s',
                            }}
                            onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = '#faf9ff'; }}
                            onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'white'; }}
                          >
                            <div style={{
                              width:32, height:32, borderRadius:'50%', flexShrink:0,
                              background: isSel ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f3f4f6',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:11, fontWeight:700, color: isSel ? 'white' : '#6b7280',
                            }}>{initials(u.name)}</div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:'0.84rem', fontWeight:600, color: isSel ? '#4c1d95' : '#1e1b4b' }}>{u.name}</div>
                              <div style={{ fontSize:'0.7rem', color:'#9ca3af' }}>{u.email}</div>
                            </div>
                            {isSel && <i className="bi bi-check-circle-fill" style={{ color:'#7c3aed', fontSize:14 }}></i>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden native select for form validation */}
              <select value={form.policyholderUserID} onChange={onFieldChange('policyholderUserID')} required style={{ display:'none' }} aria-hidden="true">
                <option value=""></option>
                {(policyholderUsers || []).map((u) => (
                  <option key={u.userID} value={u.userID}>{u.name}</option>
                ))}
              </select>

              {form.policyholderUserID && (
                <div style={{ fontSize:'0.7rem', color:'#10b981', marginTop:5 }}>
                  <i className="bi bi-check-circle-fill me-1"></i>
                  Name and email auto-filled from registration data.
                </div>
              )}
            </div>

            {/* ── Policy ──────────────────────────────────────────── */}
            <div>
              <FieldLabel icon="bi-shield-fill-check" label="Policy" required
                hint="Cannot be changed after enrollment." />
              <select
                value={form.policyID}
                onChange={onFieldChange('policyID')}
                required
                style={{ ...inputCls, appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'calc(100% - 12px) 50%', paddingRight:32 }}
              >
                <option value="">— Select a policy —</option>
                {(policies || []).map((p) => (
                  <option key={p.policyID} value={p.policyID}>{p.planName} ({p.planCode})</option>
                ))}
              </select>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
              SECTION 2 — Member Details
          ════════════════════════════════════════════════════════ */}
          <div style={{
            background:'white', border:'1.5px solid #f3f0ff',
            borderRadius:12, padding:'14px 16px', marginBottom:18,
          }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>
              <i className="bi bi-person-vcard me-1"></i>Member Details
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

              {/* Full Name */}
              <div>
                <FieldLabel icon="bi-person-fill" label="Full Name" required />
                <input placeholder="e.g. Arjun Sharma" value={form.name}
                  onChange={onFieldChange('name')} required minLength={2}
                  style={inputCls} />
              </div>

              {/* Date of Birth */}
              <div>
                <FieldLabel icon="bi-calendar3" label="Date of Birth" required locked />
                <input type="date" value={form.dob} onChange={onFieldChange('dob')}
                  min="1900-01-01" max={new Date().toISOString().split('T')[0]}
                  required style={inputCls} />
              </div>

              {/* Gender */}
              <div>
                <FieldLabel icon="bi-gender-ambiguous" label="Gender" required locked />
                <select value={form.gender} onChange={onFieldChange('gender')} required
                  style={{ ...inputCls, appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'calc(100% - 12px) 50%', paddingRight:32 }}>
                  <option value="">— Select gender —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Coverage Start */}
              <div>
                <FieldLabel icon="bi-calendar-check" label="Coverage Start" required hint="Cannot be a past date." />
                <input type="date" value={form.coverageStart} onChange={onFieldChange('coverageStart')}
                  min={new Date().toISOString().split('T')[0]} required style={inputCls} />
              </div>

              {/* Coverage End */}
              <div>
                <FieldLabel icon="bi-calendar-x" label="Coverage End"
                  hint={`Leave blank for open-ended.${policyMax ? ` Max: ${policyMax}` : ''}`} />
                <input type="date" value={form.coverageEnd} onChange={onFieldChange('coverageEnd')}
                  min={form.coverageStart || undefined} max={policyMax} style={inputCls} />
              </div>

              {/* Phone */}
              <div>
                <FieldLabel icon="bi-telephone-fill" label="Phone" />
                <input type="tel" placeholder="e.g. 9000000000" value={form.contactPhone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    onFieldChange('contactPhone')({ target: { value: digits } });
                  }}
                  maxLength={10} style={inputCls} />
              </div>

            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
              SECTION 3 — Contact Info (optional)
          ════════════════════════════════════════════════════════ */}
          <div style={{
            background:'white', border:'1.5px solid #f3f0ff',
            borderRadius:12, padding:'14px 16px',
          }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:14 }}>
              <i className="bi bi-envelope me-1"></i>Contact Info <span style={{ fontWeight:400, color:'#9ca3af', textTransform:'none', letterSpacing:0 }}>(optional)</span>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {/* Email */}
              <div>
                <FieldLabel icon="bi-envelope-fill" label="Email" />
                <input type="email" placeholder="e.g. member@example.com"
                  value={form.contactEmail} onChange={onFieldChange('contactEmail')} style={inputCls} />
              </div>

              {/* Address — full width */}
              <div style={{ gridColumn:'1 / -1' }}>
                <FieldLabel icon="bi-geo-alt-fill" label="Address" />
                <input placeholder="e.g. 123 MG Road, Mumbai"
                  value={form.contactAddress} onChange={onFieldChange('contactAddress')} style={inputCls} />
              </div>
            </div>
          </div>

        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'flex-end', gap:10,
          padding:'14px 26px 20px', background:'white',
          borderTop:'1px solid #f3f0ff', borderRadius:'0 0 12px 12px',
        }}>
          <button type="button" onClick={onHide} disabled={loading} style={{
            padding:'9px 20px', borderRadius:10,
            border:'1.5px solid #e5e7eb', background:'white',
            color:'#6b7280', fontWeight:600, fontSize:'0.85rem',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>Cancel</button>

          <button
            type="submit"
            disabled={loading || !form.policyholderUserID || isDuplicateEnrollment}
            style={{
              padding:'9px 22px', borderRadius:10, border:'none',
              background: (loading || !form.policyholderUserID || isDuplicateEnrollment)
                ? '#e5e7eb'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: (loading || !form.policyholderUserID || isDuplicateEnrollment) ? '#9ca3af' : 'white',
              fontWeight:700, fontSize:'0.85rem', cursor:'pointer',
              display:'flex', alignItems:'center', gap:7,
              boxShadow: (!loading && form.policyholderUserID && !isDuplicateEnrollment) ? '0 4px 12px rgba(102,126,234,0.35)' : 'none',
              transition:'all 0.15s',
            }}
          >
            {loading ? (
              <><Spinner animation="border" size="sm" style={{ width:14, height:14 }} /> Enrolling...</>
            ) : (
              <><i className="bi bi-person-check-fill"></i> Enroll Member</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
