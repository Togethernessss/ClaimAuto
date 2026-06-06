import { Spinner } from 'react-bootstrap';
import {
  formatDate, priorityStyle, priorityIcon,
  caseStatusStyle, caseStatusIcon, OPEN_STATUSES,
} from '../utils/fraudHelpers';

// ── Priority pill ─────────────────────────────────────────────────────────────
function PriorityPill({ priority }) {
  const s = priorityStyle(priority);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: 999,
      fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <i className={`bi ${priorityIcon(priority)}`} style={{ fontSize: 9 }}></i>
      {priority}
    </span>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const s = caseStatusStyle(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: 999,
      fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <i className={`bi ${caseStatusIcon(status)}`} style={{ fontSize: 9 }}></i>
      {status === 'UnderInvestigation' ? 'Investigating' : status}
    </span>
  );
}

// ── Outcome pill ──────────────────────────────────────────────────────────────
function OutcomePill({ outcome }) {
  if (!outcome) return <span style={{ color: '#d1d5db', fontSize: '0.78rem' }}>—</span>;

  const cfg = {
    Confirmed: { bg: '#fee2e2', color: '#dc2626', icon: 'bi-shield-x' },
    Cleared:   { bg: '#d1fae5', color: '#059669', icon: 'bi-shield-check' },
    Escalated: { bg: '#fef3c7', color: '#d97706', icon: 'bi-arrow-up-circle' },
  }[outcome] ?? { bg: '#f3f4f6', color: '#6b7280', icon: 'bi-dash-circle' };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color,
      padding: '3px 10px', borderRadius: 999,
      fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <i className={`bi ${cfg.icon}`} style={{ fontSize: 9 }}></i>
      {outcome}
    </span>
  );
}

// Grid columns differ based on whether Outcome column is shown
function buildGrid(showOutcome) {
  return showOutcome
    ? '100px 95px 115px 130px 130px 110px 110px 1fr'   // + Outcome
    : '100px 95px 115px 130px 130px 110px 1fr';         // no Outcome
}

export default function FraudCasesTable({
  cases, loading, error, isPendingTab,
  onViewDetail, onResolve, onRetry,
}) {
  const showOutcome = !isPendingTab;
  const GRID        = buildGrid(showOutcome);

  const HEADERS = showOutcome
    ? ['Case ID', 'Claim', 'Priority', 'Status', 'Opened By', 'Opened At', 'Outcome', 'Actions']
    : ['Case ID', 'Claim', 'Priority', 'Status', 'Opened By', 'Opened At', 'Actions'];

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      background: 'white', borderRadius: 16,
      boxShadow: '0 2px 12px rgba(102,126,234,0.10)',
      padding: '56px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px',
      }}>
        <Spinner animation="border" variant="light" size="sm" />
      </div>
      <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading fraud cases…</div>
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
        fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        <i className="bi bi-arrow-clockwise me-1"></i>Retry
      </button>
    </div>
  );

  // ── Empty ────────────────────────────────────────────────────────────────
  if (cases.length === 0) return (
    <div style={{
      background: 'white', borderRadius: 16,
      boxShadow: '0 2px 12px rgba(102,126,234,0.10)',
      padding: '56px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 68, height: 68, borderRadius: '50%',
        background: isPendingTab
          ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
          : 'linear-gradient(135deg, #f3f0ff, #faf5ff)',
        border: `2px solid ${isPendingTab ? '#bbf7d0' : '#ede9fe'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <i className="bi bi-shield-check" style={{
          fontSize: '1.8rem',
          color: isPendingTab ? '#16a34a' : '#7c3aed',
        }}></i>
      </div>
      <div style={{ fontWeight: 700, color: '#374151', marginBottom: 4, fontSize: '0.95rem' }}>
        {isPendingTab ? 'No open fraud cases — all clear! ✅' : 'No fraud cases found.'}
      </div>
      <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
        {isPendingTab
          ? 'There are no active fraud cases requiring investigation.'
          : 'Resolved fraud cases will appear here.'}
      </div>
    </div>
  );

  // ── Table ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'white', borderRadius: 16,
      boxShadow: '0 2px 12px rgba(102,126,234,0.10)',
      overflow: 'hidden',
      // Red left border for pending/open cases tab
      borderLeft: isPendingTab ? '4px solid #ef4444' : 'none',
    }}>
      <div style={{ overflowX: 'auto' }}>

        {/* ── Gradient header ─────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: GRID,
          background: isPendingTab
            ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '11px 18px',
          minWidth: 800,
        }}>
          {HEADERS.map((h, i) => (
            <div key={h} style={{
              fontSize: '0.69rem', fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: '0.6px', textTransform: 'uppercase',
              textAlign: i === HEADERS.length - 1 ? 'right' : 'left',
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* ── Data rows ───────────────────────────────────── */}
        {cases.map((c, idx) => {
          const isOpen = OPEN_STATUSES.includes(c.status);
          const isLast = idx === cases.length - 1;

          return (
            <div
              key={c.caseID}
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                padding: '13px 18px',
                minWidth: 800,
                alignItems: 'center',
                borderBottom: isLast ? 'none' : '1px solid #f3f0ff',
                background: isPendingTab ? '#fff5f5' : 'transparent',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isPendingTab ? '#fff1f1' : '#faf9ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isPendingTab ? '#fff5f5' : 'transparent';
              }}
            >
              {/* Case ID */}
              <div>
                <span style={{
                  fontFamily: 'monospace', fontWeight: 700,
                  fontSize: '0.82rem',
                  color: isPendingTab ? '#991b1b' : '#4c1d95',
                  background: isPendingTab ? '#fee2e2' : '#f5f3ff',
                  padding: '2px 8px', borderRadius: 6,
                }}>
                  FC-{c.caseID}
                </span>
              </div>

              {/* Claim ID */}
              <div>
                <span style={{
                  fontFamily: 'monospace', fontSize: '0.77rem',
                  color: '#7c3aed', background: '#ede9fe',
                  padding: '2px 7px', borderRadius: 5,
                }}>
                  CLM-{c.claimID}
                </span>
              </div>

              {/* Priority */}
              <div><PriorityPill priority={c.priority} /></div>

              {/* Status */}
              <div><StatusPill status={c.status} /></div>

              {/* Opened By */}
              <div style={{ fontSize: '0.82rem', color: '#374151' }}>
                <i className="bi bi-person me-1" style={{ color: '#9ca3af', fontSize: 10 }}></i>
                {c.openedByName || '—'}
              </div>

              {/* Opened At */}
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                <i className="bi bi-calendar3 me-1" style={{ fontSize: 9, color: '#9ca3af' }}></i>
                {formatDate(c.openedAt)}
              </div>

              {/* Outcome — resolved tab only */}
              {showOutcome && (
                <div><OutcomePill outcome={c.outcome} /></div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>

                {/* Details — always */}
                <button
                  onClick={() => onViewDetail(c)}
                  style={{
                    padding: '5px 11px', borderRadius: 8,
                    fontWeight: 700, fontSize: '0.72rem',
                    background: '#eff6ff', border: '1.5px solid #93c5fd',
                    color: '#1d4ed8', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
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
                  <i className="bi bi-eye" style={{ fontSize: '0.68rem' }}></i>Details
                </button>

                {/* Resolve — open cases only */}
                {isOpen && (
                  <button
                    onClick={() => onResolve(c)}
                    style={{
                      padding: '5px 11px', borderRadius: 8,
                      fontWeight: 700, fontSize: '0.72rem',
                      background: isPendingTab
                        ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                        : '#fff5f5',
                      border: isPendingTab ? 'none' : '1.5px solid #fca5a5',
                      color: isPendingTab ? 'white' : '#dc2626',
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      boxShadow: isPendingTab ? '0 2px 8px rgba(220,38,38,0.35)' : 'none',
                      transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#dc2626';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.borderColor = '#dc2626';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(220,38,38,0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isPendingTab
                        ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                        : '#fff5f5';
                      e.currentTarget.style.color = isPendingTab ? 'white' : '#dc2626';
                      e.currentTarget.style.borderColor = isPendingTab ? 'transparent' : '#fca5a5';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = isPendingTab ? '0 2px 8px rgba(220,38,38,0.35)' : 'none';
                    }}
                  >
                    <i className="bi bi-gavel" style={{ fontSize: '0.68rem' }}></i>Resolve
                  </button>
                )}

              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <div style={{
        padding: '10px 18px', borderTop: '1px solid #f3f0ff',
        background: '#faf9ff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {cases.length} case{cases.length !== 1 ? 's' : ''}
          {isPendingTab && (
            <span style={{ marginLeft: 8, color: '#ef4444', fontWeight: 600 }}>
              · Requires investigation
            </span>
          )}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
          <i className="bi bi-clock-history me-1"></i>Sorted by newest first
        </span>
      </div>
    </div>
  );
}
