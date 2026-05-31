import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../data/policyholderDashboardData';

/**
 * Recent claims list.
 * Props unchanged: { claims }
 * Navigate logic unchanged (uses /policyholder/claims and /claims?focus).
 */

const STATUS_STYLE = {
  Approved:    { bg: '#ecfdf5', color: '#065f46', dot: '#10b981' },
  Paid:        { bg: '#ecfdf5', color: '#065f46', dot: '#10b981' },
  Submitted:              { bg: '#eff6ff', color: '#1e40af', dot: '#3b82f6' },
  DocsVerificationPending:{ bg: '#e0f2fe', color: '#0369a1', dot: '#0ea5e9' },
  UnderReview:            { bg: '#fef9c3', color: '#854d0e', dot: '#f59e0b' },
  Rejected:               { bg: '#fef2f2', color: '#991b1b', dot: '#ef4444' },
};

export default function RecentClaimsTable({ claims }) {
  const navigate = useNavigate();
  const recent   = claims.slice(0, 5);

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 18,
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      {/* ── Card header ────────────────────────────────────────────── */}
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
            <i className="bi bi-folder2-open text-white" style={{ fontSize: '0.9rem' }}></i>
          </div>
          <span className="fw-bold" style={{ color: '#1e293b', fontSize: '0.97rem' }}>Recent Claims</span>
        </div>
        <button
          className="btn btn-sm rounded-pill"
          style={{ background: '#f0f4ff', color: '#4f46e5', border: 'none', fontWeight: 600, fontSize: '0.8rem', padding: '5px 14px' }}
          onClick={() => navigate('/policyholder/claims')}
        >
          View All <i className="bi bi-arrow-right ms-1"></i>
        </button>
      </div>

      {/* ── Empty state ────────────────────────────────────────────── */}
      {recent.length === 0 ? (
        <div className="text-center py-5 px-3">
          <div style={{ fontSize: 44, marginBottom: 10 }}>📂</div>
          <div className="fw-semibold" style={{ color: '#64748b', marginBottom: 4 }}>No claims yet</div>
          <small style={{ color: '#94a3b8' }}>Claims submitted by hospitals will appear here</small>
        </div>
      ) : (
        <div>
          {recent.map((c, idx) => {
            const s = STATUS_STYLE[c.status] || { bg: '#f8fafc', color: '#64748b', dot: '#94a3b8' };
            return (
              <div
                key={c.claimID}
                onClick={() => navigate(`/policyholder/claims?focus=${c.claimID}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 20px',
                  borderBottom: idx < recent.length - 1 ? '1px solid #f8fafc' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fafbff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Status dot */}
                <div
                  style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: s.dot, flexShrink: 0,
                    boxShadow: `0 0 6px ${s.dot}88`,
                  }}
                />

                {/* Claim info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span
                      className="fw-bold font-monospace"
                      style={{ fontSize: '0.8rem', color: '#4f46e5' }}
                    >
                      CLM-{c.claimID}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      · {formatDate(c.dateOfService)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.84rem', fontWeight: 600, color: '#1e293b',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {c.hospitalName}
                  </div>
                  {c.procedureName && (
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 1 }}>{c.procedureName}</div>
                  )}
                </div>

                {/* Amount + status */}
                <div className="text-end" style={{ flexShrink: 0 }}>
                  <div className="fw-bold" style={{ fontSize: '0.9rem', color: '#1e293b', marginBottom: 4 }}>
                    {formatCurrency(c.amount)}
                  </div>
                  <span
                    style={{
                      background: s.bg, color: s.color,
                      fontSize: '0.65rem', fontWeight: 700,
                      padding: '3px 9px', borderRadius: 20,
                    }}
                  >
                    {c.status}
                  </span>
                </div>

                <i className="bi bi-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.78rem', flexShrink: 0 }}></i>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
