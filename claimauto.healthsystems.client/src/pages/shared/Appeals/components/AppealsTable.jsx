import { Spinner } from 'react-bootstrap';
import {
  formatDate, statusStyle, statusIcon,
  outcomeStyle, outcomeIcon, ACTIVE_STATUSES,
} from '../utils/appealHelpers';

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const s = statusStyle(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.bg, color: s.color,
      padding: '3px 9px', borderRadius: 999,
      fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <i className={`bi ${statusIcon(status)}`} style={{ fontSize: 9 }}></i>
      {status === 'UnderReview' ? 'Under Review' : status}
    </span>
  );
}

// ── Outcome pill ──────────────────────────────────────────────────────────────
function OutcomePill({ outcome }) {
  if (!outcome) return <span style={{ color: '#d1d5db' }}>—</span>;
  const s = outcomeStyle(outcome);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.bg, color: s.color,
      padding: '3px 9px', borderRadius: 999,
      fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <i className={`bi ${outcomeIcon(outcome)}`} style={{ fontSize: 9 }}></i>
      {outcome}
    </span>
  );
}

export default function AppealsTable({
  appeals, loading, error, isActiveTab,
  isStaff, currentUserId,
  onViewDetail, onDecide, onWithdraw, onRetry,
}) {

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      background: 'white', borderRadius: 16,
      boxShadow: '0 2px 12px rgba(102,126,234,0.10)',
      padding: '56px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px',
      }}>
        <Spinner animation="border" variant="light" size="sm" />
      </div>
      <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading appeals…</div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: '#fff5f5', border: '1px solid #fca5a5',
      borderRadius: 14, padding: '16px 20px',
    }}>
      <i className="bi bi-exclamation-triangle-fill" style={{ color: '#dc2626', fontSize: 18, flexShrink: 0 }}></i>
      <div style={{ flex: 1, color: '#dc2626', fontSize: '0.85rem' }}>{error}</div>
      <button onClick={onRetry} style={{
        background: '#fee2e2', border: '1px solid #fca5a5',
        color: '#dc2626', borderRadius: 20, padding: '5px 14px',
        fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
      }}>
        <i className="bi bi-arrow-clockwise me-1"></i>Retry
      </button>
    </div>
  );

  // ── Empty ────────────────────────────────────────────────────────────────
  if (appeals.length === 0) return (
    <div style={{
      background: 'white', borderRadius: 16,
      boxShadow: '0 2px 12px rgba(102,126,234,0.10)',
      padding: '56px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 68, height: 68, borderRadius: '50%',
        background: 'linear-gradient(135deg, #f3f0ff, #faf5ff)',
        border: '2px solid #ede9fe',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <i className="bi bi-megaphone" style={{ fontSize: '1.8rem', color: '#7c3aed' }}></i>
      </div>
      <div style={{ fontWeight: 700, color: '#374151', marginBottom: 4 }}>
        {isActiveTab ? 'No active appeals — all caught up!' : 'No appeals found.'}
      </div>
      <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
        {isActiveTab ? 'There are no pending appeals to review.' : 'Resolved and withdrawn appeals will appear here.'}
      </div>
    </div>
  );

  // Grid: Appeal ID | Claim | Filed By | Filed At | Status | [Outcome] | Reason | Actions
  const gridCols = isActiveTab
    ? '100px 90px 130px 110px 130px 1fr 200px'
    : '100px 90px 130px 110px 130px 110px 1fr 200px';

  const headers = isActiveTab
    ? ['Appeal ID', 'Claim', 'Filed By', 'Filed At', 'Status', 'Reason', 'Actions']
    : ['Appeal ID', 'Claim', 'Filed By', 'Filed At', 'Status', 'Outcome', 'Reason', 'Actions'];

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      boxShadow: '0 2px 12px rgba(102,126,234,0.10)',
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>

        {/* ── Gradient header ─────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: gridCols,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '11px 18px', minWidth: 860,
        }}>
          {headers.map((h, i) => (
            <div key={h} style={{
              fontSize: '0.69rem', fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: '0.6px', textTransform: 'uppercase',
              textAlign: i === headers.length - 1 ? 'right' : 'left',
            }}>{h}</div>
          ))}
        </div>

        {/* ── Data rows ───────────────────────────────────── */}
        {appeals.map((a, idx) => {
          const isActive = ACTIVE_STATUSES.includes(a.status);
          const isLast   = idx === appeals.length - 1;

          return (
            <div
              key={a.appealID}
              style={{
                display: 'grid', gridTemplateColumns: gridCols,
                padding: '13px 18px', minWidth: 860,
                alignItems: 'center',
                borderBottom: isLast ? 'none' : '1px solid #f3f0ff',
                background: isActiveTab ? '#faf9ff' : 'transparent',
                borderLeft: isActiveTab ? '3px solid #667eea' : '3px solid transparent',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f3ff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isActiveTab ? '#faf9ff' : 'transparent'; }}
            >
              {/* Appeal ID */}
              <div>
                <span style={{
                  fontFamily: 'monospace', fontWeight: 700,
                  fontSize: '0.82rem', color: '#4c1d95',
                  background: '#f5f3ff', padding: '2px 8px', borderRadius: 6,
                }}>
                  APL-{a.appealID}
                </span>
              </div>

              {/* Claim ID */}
              <div>
                <span style={{
                  fontFamily: 'monospace', fontSize: '0.77rem', color: '#7c3aed',
                  background: '#ede9fe', padding: '2px 7px', borderRadius: 5,
                }}>
                  CLM-{a.claimID}
                </span>
              </div>

              {/* Filed By */}
              <div style={{ fontSize: '0.82rem', color: '#374151' }}>
                <i className="bi bi-person me-1" style={{ color: '#9ca3af', fontSize: 10 }}></i>
                {a.filedByName || '—'}
              </div>

              {/* Filed At */}
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                <i className="bi bi-calendar3 me-1" style={{ fontSize: 9, color: '#9ca3af' }}></i>
                {formatDate(a.filedAt)}
              </div>

              {/* Status */}
              <div><StatusPill status={a.status} /></div>

              {/* Outcome — history tab only */}
              {!isActiveTab && (
                <div><OutcomePill outcome={a.outcome} /></div>
              )}

              {/* Reason */}
              <div style={{
                fontSize: '0.78rem', color: '#6b7280',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: '100%', paddingRight: 8,
              }}>
                {a.reason}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>

                {/* Details — always */}
                <button
                  onClick={() => onViewDetail(a)}
                  style={{
                    padding: '5px 11px', borderRadius: 8, fontWeight: 700, fontSize: '0.72rem',
                    background: '#eff6ff', border: '1.5px solid #93c5fd', color: '#1d4ed8',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8'; e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <i className="bi bi-eye" style={{ fontSize: '0.68rem' }}></i>Details
                </button>

                {/* Decide — Staff + active appeal */}
                {isStaff && isActive && (
                  <button
                    onClick={() => onDecide(a)}
                    style={{
                      padding: '5px 11px', borderRadius: 8, fontWeight: 700, fontSize: '0.72rem',
                      background: isActiveTab
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : '#f5f3ff',
                      border: isActiveTab ? 'none' : '1.5px solid #a78bfa',
                      color: isActiveTab ? 'white' : '#7c3aed',
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                      transition: 'all 0.15s', whiteSpace: 'nowrap',
                      boxShadow: isActiveTab ? '0 2px 8px rgba(102,126,234,0.35)' : 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(102,126,234,0.4)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isActiveTab ? '0 2px 8px rgba(102,126,234,0.35)' : 'none'; }}
                  >
                    <i className="bi bi-gavel" style={{ fontSize: '0.68rem' }}></i>Decide
                  </button>
                )}

                {/* Withdraw — non-staff, active, filed by someone */}
                {!isStaff && isActive && a.filedByName && (
                  <button
                    onClick={() => onWithdraw(a)}
                    style={{
                      padding: '5px 11px', borderRadius: 8, fontWeight: 700, fontSize: '0.72rem',
                      background: '#fff5f5', border: '1.5px solid #fca5a5', color: '#dc2626',
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                      transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <i className="bi bi-x-circle" style={{ fontSize: '0.68rem' }}></i>Withdraw
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 18px', borderTop: '1px solid #f3f0ff', background: '#faf9ff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {appeals.length} appeal{appeals.length !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
          <i className="bi bi-clock-history me-1"></i>Sorted by newest first
        </span>
      </div>
    </div>
  );
}
