// src/components/policyholder/MyMemberCard.jsx
// Shows the Policyholder's own enrollment details on the dashboard.
// Props unchanged: { member }

import { formatDate } from '../../data/policyholderDashboardData';

export default function MyMemberCard({ member }) {

  // ── Not enrolled ───────────────────────────────────────────────────
  if (!member) {
    return (
      <div
        style={{
          background: 'white',
          borderRadius: 18,
          boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 10 }}>👤</div>
        <div className="fw-semibold" style={{ color: '#1e293b', marginBottom: 6 }}>Not Enrolled Yet</div>
        <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6 }}>
          Your insurance provider will assign your membership.
          <br />
          Please contact support if this takes too long.
        </div>
      </div>
    );
  }

  // Status styling — logic unchanged
  const statusStyle =
    member.status === 'Active'    ? { bg: '#ecfdf5', color: '#065f46', dot: '#10b981' } :
    member.status === 'Suspended' ? { bg: '#fffbeb', color: '#92400e', dot: '#f59e0b' } :
                                    { bg: '#f8fafc',  color: '#64748b', dot: '#94a3b8'  };

  // Detail rows — same fields as before
  const details = [
    { icon: 'bi-shield-check',    label: 'Policy',         value: member.policyName ?? '—',       color: '#4f46e5' },
    { icon: 'bi-calendar-check',  label: 'Coverage Start', value: formatDate(member.coverageStart), color: '#10b981' },
    { icon: 'bi-calendar-x',      label: 'Coverage End',   value: member.coverageEnd ? formatDate(member.coverageEnd) : 'Open-ended', color: '#f59e0b' },
    { icon: 'bi-person',          label: 'Gender',          value: member.gender ?? '—',             color: '#6366f1' },
  ];

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 18,
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div
        className="d-flex align-items-center justify-content-between px-4 py-3"
        style={{ borderBottom: '1px solid #f1f5f9' }}
      >
        <div className="d-flex align-items-center gap-2">
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="bi bi-person-badge-fill text-white" style={{ fontSize: '0.9rem' }}></i>
          </div>
          <span className="fw-bold" style={{ color: '#1e293b', fontSize: '0.97rem' }}>My Enrollment</span>
        </div>
        <span
          style={{
            background: statusStyle.bg,
            color: statusStyle.color,
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: 20,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusStyle.dot }} />
          {member.status}
        </span>
      </div>

      <div className="px-4 py-3">
        {/* ── Member identity block ────────────────────────────── */}
        <div
          className="d-flex align-items-center gap-3 mb-3 p-3 rounded-3"
          style={{ background: '#f8f9ff', border: '1px solid #e0e7ff' }}
        >
          <div
            style={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: '1.25rem',
            }}
          >
            {member.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="fw-bold" style={{ color: '#1e293b', fontSize: '1rem' }}>{member.name}</div>
            <div
              className="font-monospace"
              style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 600 }}
            >
              {member.memberNumber ?? '—'}
            </div>
          </div>
        </div>

        {/* ── Detail rows ──────────────────────────────────────── */}
        {details.map((row, idx) => (
          <div
            key={row.label}
            className="d-flex align-items-center justify-content-between py-2"
            style={{ borderBottom: idx < details.length - 1 ? '1px solid #f8fafc' : 'none' }}
          >
            <div className="d-flex align-items-center gap-2">
              <i className={`bi ${row.icon}`} style={{ color: row.color, fontSize: '0.85rem' }}></i>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{row.label}</span>
            </div>
            <span className="fw-semibold" style={{ fontSize: '0.82rem', color: '#1e293b' }}>{row.value}</span>
          </div>
        ))}

        {/* ── Footer note ──────────────────────────────────────── */}
        <div className="text-center mt-3" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
          <i className="bi bi-info-circle me-1"></i>
          Enrollment managed by your insurance provider. Contact support to update details.
        </div>
      </div>
    </div>
  );
}
