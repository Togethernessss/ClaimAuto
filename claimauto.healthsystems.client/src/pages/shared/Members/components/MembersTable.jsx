import { useState }           from 'react';
import { Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
  formatDate,
  calcAge,
  genderIcon,
} from '../utils/memberHelpers';

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const cfg = {
    Active:    { dot:'#10b981', bg:'#d1fae5', text:'#065f46' },
    Inactive:  { dot:'#9ca3af', bg:'#f3f4f6', text:'#4b5563' },
    Suspended: { dot:'#f59e0b', bg:'#fef3c7', text:'#92400e' },
  }[status] ?? { dot:'#9ca3af', bg:'#f3f4f6', text:'#4b5563' };

  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      background: cfg.bg, color: cfg.text,
      padding:'3px 10px', borderRadius:999,
      fontSize:'0.73rem', fontWeight:700, whiteSpace:'nowrap',
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot, flexShrink:0 }} />
      {status}
    </span>
  );
}

// ── Gender avatar ─────────────────────────────────────────────────────────────
const GENDER_COLOR = {
  Male:    { bg:'#dbeafe', icon:'#3b82f6' },
  Female:  { bg:'#fce7f3', icon:'#ec4899' },
  Other:   { bg:'#f3f0ff', icon:'#7c3aed' },
};

export default function MembersTable({
  members,
  loading,
  error,
  isAdmin,
  isStaff,
  isHospital,
  hasFilters,
  onRetry,
  onEdit,
  onCheckEligibility,
  onCreateFirst,
}) {
  const canEdit = isAdmin || isStaff;

  const [copiedId, setCopiedId] = useState(null);

  function handleCopyMemberNumber(memberID, memberNumber) {
    navigator.clipboard.writeText(memberNumber)
      .then(() => {
        setCopiedId(memberID);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => {});
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      background:'white', borderRadius:16,
      boxShadow:'0 2px 12px rgba(102,126,234,0.10)',
      padding:'56px 24px', textAlign:'center',
    }}>
      <div style={{
        width:52, height:52, borderRadius:'50%',
        background:'linear-gradient(135deg, #667eea, #764ba2)',
        display:'flex', alignItems:'center', justifyContent:'center',
        margin:'0 auto 14px',
      }}>
        <Spinner animation="border" variant="light" size="sm" />
      </div>
      <div style={{ color:'#6b7280', fontSize:'0.85rem' }}>Loading members…</div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (!loading && error) return (
    <div style={{
      display:'flex', alignItems:'center', gap:12,
      background:'#fff5f5', border:'1px solid #fca5a5',
      borderRadius:14, padding:'16px 20px',
    }}>
      <i className="bi bi-exclamation-triangle-fill" style={{ color:'#dc2626', fontSize:18, flexShrink:0 }}></i>
      <div style={{ flex:1, color:'#dc2626', fontSize:'0.85rem' }}>{error}</div>
      <button onClick={onRetry} style={{
        background:'#fee2e2', border:'1px solid #fca5a5',
        color:'#dc2626', borderRadius:20, padding:'5px 14px',
        fontSize:'0.78rem', fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
      }}>
        <i className="bi bi-arrow-clockwise me-1"></i>Retry
      </button>
    </div>
  );

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (!loading && !error && members.length === 0) return (
    <div style={{
      background:'white', borderRadius:16,
      boxShadow:'0 2px 12px rgba(102,126,234,0.10)',
      padding:'56px 24px', textAlign:'center',
    }}>
      <div style={{
        width:68, height:68, borderRadius:'50%',
        background:'linear-gradient(135deg, #f3f0ff, #faf5ff)',
        border:'2px solid #ede9fe',
        display:'flex', alignItems:'center', justifyContent:'center',
        margin:'0 auto 16px',
      }}>
        <i className="bi bi-people" style={{ fontSize:'1.8rem', color:'#7c3aed' }}></i>
      </div>
      <div style={{ fontWeight:700, color:'#374151', marginBottom:4, fontSize:'0.95rem' }}>
        {hasFilters ? 'No members match your filters' : 'No members yet'}
      </div>
      <div style={{ fontSize:'0.82rem', color:'#9ca3af', marginBottom: canEdit && !hasFilters ? 16 : 0 }}>
        {hasFilters ? 'Try adjusting your search or status filter.' : 'Enroll your first member to get started.'}
      </div>
      {canEdit && !hasFilters && (
        <button onClick={onCreateFirst} style={{
          padding:'8px 20px', borderRadius:10, border:'none',
          background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color:'white', fontWeight:700, fontSize:'0.83rem',
          cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6,
          boxShadow:'0 4px 12px rgba(102,126,234,0.35)',
        }}>
          <i className="bi bi-person-plus-fill"></i>Enroll First Member
        </button>
      )}
    </div>
  );

  // ── Table ─────────────────────────────────────────────────────────────────
  const COLS = canEdit
    ? '46px 1fr 160px 120px 120px 120px 100px 240px'
    : '46px 1fr 160px 120px 120px 120px 100px 160px';

  return (
    <div style={{
      background:'white', borderRadius:16,
      boxShadow:'0 2px 12px rgba(102,126,234,0.10)',
      overflow:'hidden',
    }}>
      {/* ── Gradient header row ──────────────────────────── */}
      <div style={{
        display:'grid', gridTemplateColumns: COLS,
        background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding:'11px 18px', minWidth:'max-content', width:'100%',
      }}>
        {['', 'Member', 'Policy', 'DOB / Age', 'Coverage Start', 'Coverage End', 'Status', 'Actions'].map((h, i) => (
          <div key={i} style={{
            fontSize:'0.7rem', fontWeight:700,
            color:'rgba(255,255,255,0.85)',
            letterSpacing:'0.6px', textTransform:'uppercase',
            textAlign: i === 7 ? 'right' : 'left',
          }}>
            {h}
          </div>
        ))}
      </div>

      {/* ── Data rows ───────────────────────────────────── */}
      <div style={{ overflowX:'auto' }}>
        {members.map((member, idx) => {
          const gc   = GENDER_COLOR[member.gender] ?? GENDER_COLOR.Other;
          const isLast = idx === members.length - 1;

          return (
            <div
              key={member.memberID}
              style={{
                display:'grid', gridTemplateColumns: COLS,
                padding:'13px 18px', minWidth:'max-content', width:'100%',
                alignItems:'center',
                borderBottom: isLast ? 'none' : '1px solid #f3f0ff',
                transition:'background 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#faf9ff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Gender avatar */}
              <div style={{
                width:36, height:36, borderRadius:'50%', flexShrink:0,
                background: gc.bg,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <i className={`${genderIcon(member.gender)}`} style={{ fontSize:'1rem', color: gc.icon }}></i>
              </div>

              {/* Name + member number */}
              <div style={{ paddingLeft:10 }}>
                <div style={{ fontWeight:700, color:'#1e1b4b', fontSize:'0.88rem' }}>{member.name}</div>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:3 }}>
                  <span style={{
                    fontFamily:'monospace', fontSize:'0.7rem', fontWeight:700,
                    color:'#7c3aed', background:'#f5f3ff',
                    padding:'1px 7px', borderRadius:5,
                  }}>{member.memberNumber}</span>

                  {isHospital && (
                    <OverlayTrigger placement="top" overlay={
                      <Tooltip>{copiedId === member.memberID ? 'Copied!' : 'Copy Member ID — use when submitting a claim'}</Tooltip>
                    }>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyMemberNumber(member.memberID, member.memberNumber); }}
                        style={{
                          background: copiedId === member.memberID ? '#d1fae5' : '#f3f4f6',
                          border: `1px solid ${copiedId === member.memberID ? '#6ee7b7' : '#e5e7eb'}`,
                          borderRadius:5, padding:'1px 5px', cursor:'pointer',
                          color: copiedId === member.memberID ? '#059669' : '#7c3aed',
                          fontSize:11, transition:'all 0.15s',
                          display:'flex', alignItems:'center', lineHeight:1,
                        }}
                      >
                        <i className={`bi ${copiedId === member.memberID ? 'bi-check2' : 'bi-clipboard'}`} />
                      </button>
                    </OverlayTrigger>
                  )}
                </div>
              </div>

              {/* Policy */}
              <div style={{ fontSize:'0.83rem', fontWeight:600, color:'#374151' }}>
                {member.policyName || '—'}
              </div>

              {/* DOB / Age */}
              <div>
                <div style={{ fontSize:'0.83rem', color:'#374151' }}>{formatDate(member.dob)}</div>
                <div style={{ fontSize:'0.7rem', color:'#9ca3af', marginTop:1 }}>{calcAge(member.dob)}</div>
              </div>

              {/* Coverage Start */}
              <div style={{ fontSize:'0.83rem', color:'#374151' }}>{formatDate(member.coverageStart)}</div>

              {/* Coverage End */}
              <div style={{ fontSize:'0.83rem', color: member.coverageEnd ? '#374151' : '#9ca3af', fontStyle: member.coverageEnd ? 'normal' : 'italic' }}>
                {member.coverageEnd ? formatDate(member.coverageEnd) : 'Open-ended'}
              </div>

              {/* Status */}
              <div><StatusPill status={member.status} /></div>

              {/* Actions */}
              <div style={{ display:'flex', gap:7, justifyContent:'flex-end', flexWrap:'nowrap' }}>

                {/* Check Eligibility */}
                <button
                  onClick={() => onCheckEligibility(member)}
                  style={{
                    padding:'5px 12px', borderRadius:8, fontWeight:600, fontSize:'0.75rem',
                    background:'#f0fdf4', border:'1.5px solid #86efac',
                    color:'#15803d', cursor:'pointer', transition:'all 0.15s',
                    display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background='#16a34a'; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor='#16a34a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background='#f0fdf4'; e.currentTarget.style.color='#15803d'; e.currentTarget.style.borderColor='#86efac'; }}
                >
                  <i className="bi bi-shield-check" style={{ fontSize:'0.7rem' }}></i>
                  Eligibility
                </button>

                {/* Edit — Admin + Staff only */}
                {canEdit ? (
                  <button
                    onClick={() => onEdit(member)}
                    style={{
                      padding:'5px 12px', borderRadius:8, fontWeight:600, fontSize:'0.75rem',
                      background:'#eff6ff', border:'1.5px solid #93c5fd',
                      color:'#1d4ed8', cursor:'pointer', transition:'all 0.15s',
                      display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background='#2563eb'; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor='#2563eb'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background='#eff6ff'; e.currentTarget.style.color='#1d4ed8'; e.currentTarget.style.borderColor='#93c5fd'; }}
                  >
                    <i className="bi bi-pencil-fill" style={{ fontSize:'0.7rem' }}></i>
                    Edit
                  </button>
                ) : (
                  <span style={{ fontSize:'0.75rem', color:'#9ca3af', fontStyle:'italic', display:'flex', alignItems:'center', gap:4 }}>
                    <i className="bi bi-eye"></i>View only
                  </span>
                )}

              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <div style={{
        padding:'10px 18px', borderTop:'1px solid #f3f0ff',
        background:'#faf9ff', display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <span style={{ fontSize:'0.75rem', color:'#6b7280' }}>
          {members.length} member{members.length !== 1 ? 's' : ''} shown
        </span>
        <span style={{ fontSize:'0.7rem', color:'#9ca3af' }}>
          <i className="bi bi-sort-down me-1"></i>Sorted by newest first
        </span>
      </div>
    </div>
  );
}
