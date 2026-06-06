// src/pages/shared/Adjudication/components/AdjudicationTable.jsx
import { Spinner } from 'react-bootstrap';
import {
  formatDate, formatCurrency,
  claimStatusStyle, claimTypeStyle,
  ADJUDICABLE_STATUSES,
} from '../utils/adjudicationHelpers';

function StatusPill({ status }) {
  const s = claimStatusStyle(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: s.bg, color: s.color,
      padding: '3px 9px', borderRadius: 999,
      fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, opacity: 0.75, flexShrink: 0 }} />
      {status === 'UnderReview' ? 'Under Review' : status}
    </span>
  );
}

function TypePill({ type }) {
  const s = claimTypeStyle(type);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: s.bg, color: s.color,
      padding: '3px 9px', borderRadius: 999,
      fontSize: '0.71rem', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {type}
    </span>
  );
}

// Grid: Claim | Member | Provider | Type | Billed | Status | Submitted | Actions
const GRID = '110px 1fr 130px 110px 110px 130px 110px 140px';

export default function AdjudicationTable({
  claims,
  loading,
  error,
  hasFilters,
  actionLoading,
  onRetry,
  onManualAdjudicate,
  onViewResult,
  isPendingQueue = false,
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
        background: isPendingQueue
          ? 'linear-gradient(135deg, #e65100, #bf360c)'
          : 'linear-gradient(135deg, #667eea, #764ba2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px',
      }}>
        <Spinner animation="border" variant="light" size="sm" />
      </div>
      <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading claims…</div>
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
  if (claims.length === 0) return (
    <div style={{
      background: 'white', borderRadius: 16,
      boxShadow: '0 2px 12px rgba(102,126,234,0.10)',
      padding: '56px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 68, height: 68, borderRadius: '50%',
        background: isPendingQueue ? 'linear-gradient(135deg, #fff7ed, #ffedd5)' : 'linear-gradient(135deg, #f3f0ff, #faf5ff)',
        border: `2px solid ${isPendingQueue ? '#fed7aa' : '#ede9fe'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <i className="bi bi-check2-square" style={{ fontSize: '1.8rem', color: isPendingQueue ? '#f97316' : '#7c3aed' }}></i>
      </div>
      <div style={{ fontWeight: 700, color: '#374151', marginBottom: 4 }}>
        {hasFilters ? 'No claims match your filters' : isPendingQueue ? 'No claims pending manual review' : 'No claims yet'}
      </div>
      <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
        {hasFilters ? 'Try clearing your filters.' : isPendingQueue ? 'All claims have been adjudicated. ✅' : 'Claims will appear here once submitted.'}
      </div>
    </div>
  );

  // ── Table ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'white', borderRadius: 16,
      boxShadow: '0 2px 12px rgba(102,126,234,0.10)',
      overflow: 'hidden',
      // Pending queue: left accent border
      borderLeft: isPendingQueue ? '4px solid #f97316' : 'none',
    }}>
      <div style={{ overflowX: 'auto' }}>

        {/* ── Header ──────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: GRID,
          background: isPendingQueue
            ? 'linear-gradient(135deg, #ea580c 0%, #9a3412 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '11px 18px', minWidth: 860,
        }}>
          {['Claim', 'Member', 'Provider', 'Type', 'Billed', 'Status', 'Submitted', 'Actions'].map((h, i) => (
            <div key={h} style={{
              fontSize: '0.69rem', fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: '0.6px', textTransform: 'uppercase',
              textAlign: i === 7 ? 'right' : 'left',
            }}>{h}</div>
          ))}
        </div>

        {/* ── Rows ────────────────────────────────────────── */}
        {claims.map((claim, idx) => {
          const canAdjudicate = ADJUDICABLE_STATUSES.includes(claim.status);
          const isActioning   = actionLoading === claim.claimID;
          const isLast        = idx === claims.length - 1;

          return (
            <div
              key={claim.claimID}
              style={{
                display: 'grid', gridTemplateColumns: GRID,
                padding: '13px 18px', minWidth: 860,
                alignItems: 'center',
                borderBottom: isLast ? 'none' : '1px solid #f3f0ff',
                background: isPendingQueue ? '#fffbf5' : 'transparent',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = isPendingQueue ? '#fff7ed' : '#faf9ff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isPendingQueue ? '#fffbf5' : 'transparent'; }}
            >

              {/* Claim ID */}
              <div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.83rem', color: '#1e1b4b' }}>
                  CLM-{claim.claimID}
                </div>
                {claim.externalClaimRef && (
                  <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: 1 }}>
                    {claim.externalClaimRef}
                  </div>
                )}
              </div>

              {/* Member + Policy */}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#1e1b4b' }}>{claim.memberName}</div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: 1 }}>{claim.policyName}</div>
              </div>

              {/* Provider */}
              <div style={{ fontSize: '0.82rem', color: '#374151' }}>{claim.providerName}</div>

              {/* Type */}
              <div><TypePill type={claim.claimType} /></div>

              {/* Billed */}
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e1b4b' }}>
                {formatCurrency(claim.totalBilledAmount)}
              </div>

              {/* Status */}
              <div><StatusPill status={claim.status} /></div>

              {/* Submitted */}
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                <i className="bi bi-calendar3 me-1" style={{ fontSize: 9, color: '#9ca3af' }}></i>
                {formatDate(claim.submittedAt)}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>

                {/* Manual Adjudicate */}
                {canAdjudicate && onManualAdjudicate && (
                  <button
                    disabled={isActioning}
                    onClick={() => onManualAdjudicate(claim)}
                    style={{
                      padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: '0.73rem',
                      border: 'none', cursor: isActioning ? 'not-allowed' : 'pointer',
                      background: isPendingQueue
                        ? 'linear-gradient(135deg, #e65100 0%, #bf360c 100%)'
                        : '#fff3e0',
                      color: isPendingQueue ? 'white' : '#e65100',
                      border: isPendingQueue ? 'none' : '1.5px solid #e65100',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActioning) {
                        e.currentTarget.style.background = '#e65100';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 3px 8px rgba(230,81,0,0.35)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isPendingQueue
                        ? 'linear-gradient(135deg, #e65100 0%, #bf360c 100%)'
                        : '#fff3e0';
                      e.currentTarget.style.color = isPendingQueue ? 'white' : '#e65100';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {isActioning
                      ? <Spinner animation="border" size="sm" style={{ width: 13, height: 13 }} />
                      : <><i className="bi bi-pencil-fill" style={{ fontSize: '0.68rem' }}></i>
                          {isPendingQueue ? 'Decide Now' : 'Manual'}</>}
                  </button>
                )}

                {/* View Result */}
                {!canAdjudicate && (
                  <button
                    onClick={() => onViewResult(claim)}
                    style={{
                      padding: '5px 14px', borderRadius: 8, fontWeight: 700, fontSize: '0.73rem',
                      background: '#eff6ff', border: '1.5px solid #93c5fd',
                      color: '#1d4ed8', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#2563eb';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.borderColor = '#2563eb';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#eff6ff';
                      e.currentTarget.style.color = '#1d4ed8';
                      e.currentTarget.style.borderColor = '#93c5fd';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <i className="bi bi-eye" style={{ fontSize: '0.68rem' }}></i>View Result
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
          {claims.length} claim{claims.length !== 1 ? 's' : ''}
          {isPendingQueue && <span style={{ marginLeft: 8, color: '#f97316', fontWeight: 600 }}>· Pending review</span>}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
          <i className="bi bi-sort-down me-1"></i>Sorted by submitted date
        </span>
      </div>
    </div>
  );
}
