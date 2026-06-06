// src/pages/shared/Policies/components/PoliciesTable.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Redesigned policies table with gradient header, CSS-grid layout, and
// clickable rows.  All original role-based action logic is preserved.
//
// New prop: onView(policy) — called when any row is clicked.
//   Admin    → Edit + Deactivate action buttons (still work via stopPropagation)
//   Staff    → click row → opens detail modal (view only)
//   Hospital → click row → opens detail modal (simplified columns)
//   PH       → click row → opens detail modal (same as staff columns)
// ─────────────────────────────────────────────────────────────────────────────
import { Spinner } from 'react-bootstrap';
import { formatCurrency, formatDate } from '../utils/policyHelpers';

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const cfgMap = {
    Active:    { dot: '#10b981', bg: '#d1fae5', text: '#065f46' },
    Expired:   { dot: '#9ca3af', bg: '#f3f4f6', text: '#4b5563' },
    Suspended: { dot: '#f59e0b', bg: '#fef3c7', text: '#92400e' },
  };
  const cfg = cfgMap[status] ?? cfgMap.Expired;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.text,
      padding: '3px 10px', borderRadius: 999,
      fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

// ── Column layout helpers ─────────────────────────────────────────────────────
function gridCols(isAdmin, isHospital) {
  if (isHospital) return '2fr 110px 110px 100px 100px 110px';
  if (isAdmin)    return '2fr 110px 110px 100px 100px 80px 110px 120px';
  return                 '2fr 110px 110px 100px 100px 80px 110px';       // Staff / PH
}

function columnHeaders(isAdmin, isHospital) {
  if (isHospital) return ['Plan', 'Sum Insured', 'Deductible', 'From', 'To', 'Status'];
  if (isAdmin)    return ['Plan', 'Sum Insured', 'Deductible', 'From', 'To', 'Members', 'Status', 'Actions'];
  return                 ['Plan', 'Sum Insured', 'Deductible', 'From', 'To', 'Members', 'Status'];
}

// ── Header row ────────────────────────────────────────────────────────────────
function HeaderRow({ isAdmin, isHospital }) {
  const cols = columnHeaders(isAdmin, isHospital);
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: gridCols(isAdmin, isHospital),
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '12px 16px',
      borderRadius: '12px 12px 0 0',
      position: 'sticky', top: 0, zIndex: 1,
      minWidth: 'max-content', width: '100%',
    }}>
      {cols.map((h, i) => (
        <div key={h} style={{
          fontSize: '0.72rem', fontWeight: 700,
          color: 'rgba(255,255,255,0.85)',
          letterSpacing: '0.6px', textTransform: 'uppercase',
          textAlign: isAdmin && i === cols.length - 1 ? 'right' : 'left',
          paddingLeft: i === 0 ? 4 : 0,
        }}>
          {h}
        </div>
      ))}
    </div>
  );
}

// ── Policy row ────────────────────────────────────────────────────────────────
function PolicyRow({ policy, isAdmin, isHospital, onView, onEdit, onDeactivate }) {
  const clickable = !!onView;
  return (
    <div
      onClick={() => clickable && onView(policy)}
      style={{
        display: 'grid',
        gridTemplateColumns: gridCols(isAdmin, isHospital),
        padding: '12px 16px',
        borderBottom: '1px solid #f3f0ff',
        background: 'white',
        alignItems: 'center',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'background 0.12s',
        minWidth: 'max-content', width: '100%',
      }}
      onMouseEnter={(e) => { if (clickable) e.currentTarget.style.background = '#faf9ff'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
    >
      {/* Plan name + code */}
      <div style={{ paddingLeft: 4 }}>
        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1f2937' }}>
          {policy.planName}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#9ca3af', fontFamily: 'monospace', marginTop: 1 }}>
          {policy.planCode}
        </div>
      </div>

      {/* Sum Insured */}
      <div style={{ fontSize: '0.83rem', color: '#374151' }}>
        {formatCurrency(policy.sumInsured)}
      </div>

      {/* Deductible */}
      <div style={{ fontSize: '0.83rem', color: '#374151' }}>
        {formatCurrency(policy.deductibleAmount)}
      </div>

      {/* Effective From */}
      <div style={{ fontSize: '0.83rem', color: '#374151' }}>
        {formatDate(policy.effectiveFrom)}
      </div>

      {/* Effective To */}
      <div style={{ fontSize: '0.83rem', color: policy.effectiveTo ? '#374151' : '#9ca3af' }}>
        {formatDate(policy.effectiveTo) || 'Ongoing'}
      </div>

      {/* Members — hidden for Hospital */}
      {!isHospital && (
        <div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#f3f4f6', borderRadius: 999,
            padding: '2px 8px', fontSize: '0.75rem', color: '#374151',
          }}>
            <i className="bi bi-people" style={{ fontSize: '0.7rem' }}></i>
            {policy.memberCount ?? 0}
          </span>
        </div>
      )}

      {/* Status */}
      <div><StatusPill status={policy.status} /></div>

      {/* Actions — Admin only */}
      {isAdmin && (
        <div
          className="d-flex justify-content-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Edit */}
          <button
            title={policy.status === 'Expired' ? 'Policy is locked' : 'Edit policy'}
            disabled={policy.status === 'Expired'}
            onClick={(e) => { e.stopPropagation(); onEdit?.(policy); }}
            style={{
              width: 30, height: 30, borderRadius: 7,
              border: 'none',
              background: policy.status === 'Expired' ? '#f3f4f6' : '#ede9fe',
              color:      policy.status === 'Expired' ? '#9ca3af' : '#7c3aed',
              cursor:     policy.status === 'Expired' ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, transition: 'background 0.12s, color 0.12s',
            }}
            onMouseEnter={(e) => {
              if (policy.status !== 'Expired') {
                e.currentTarget.style.background = '#7c3aed';
                e.currentTarget.style.color      = 'white';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = policy.status === 'Expired' ? '#f3f4f6' : '#ede9fe';
              e.currentTarget.style.color      = policy.status === 'Expired' ? '#9ca3af' : '#7c3aed';
            }}
          >
            <i className="bi bi-pencil-fill"></i>
          </button>

          {/* Deactivate / Expire */}
          {(policy.status === 'Active' || policy.status === 'Suspended') && (
            <button
              title={policy.status === 'Active' ? 'Deactivate policy' : 'Expire policy'}
              onClick={(e) => { e.stopPropagation(); onDeactivate?.(policy); }}
              style={{
                width: 30, height: 30, borderRadius: 7,
                border: 'none',
                background: policy.status === 'Suspended' ? '#fff3cd' : '#fee2e2',
                color:      policy.status === 'Suspended' ? '#e65100' : '#dc2626',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, transition: 'background 0.12s, color 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = policy.status === 'Suspended' ? '#f9a825' : '#dc2626';
                e.currentTarget.style.color      = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = policy.status === 'Suspended' ? '#fff3cd' : '#fee2e2';
                e.currentTarget.style.color      = policy.status === 'Suspended' ? '#e65100' : '#dc2626';
              }}
            >
              <i className={policy.status === 'Suspended' ? 'bi bi-slash-circle' : 'bi bi-slash-circle-fill'}></i>
            </button>
          )}

          {/* Locked (Expired — no action) */}
          {policy.status === 'Expired' && (
            <button
              disabled
              title="Policy permanently expired"
              style={{
                width: 30, height: 30, borderRadius: 7,
                border: 'none', background: '#f3f4f6',
                color: '#9ca3af', cursor: 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12,
              }}
            >
              <i className="bi bi-lock-fill"></i>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function PoliciesTable({
  policies,       // array  — filtered policies to display
  loading,        // boolean
  error,          // string | null
  isAdmin,        // boolean
  isHospital,     // boolean
  hasFilters,     // boolean
  onRetry,        // function
  onEdit,         // function(policy)
  onDeactivate,   // function(policy)
  onCreateFirst,  // function
  onView,         // function(policy) — NEW: opens detail modal
}) {
  return (
    <div style={{
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 2px 16px rgba(118,75,162,0.08)',
      background: 'white',
      marginBottom: 24,
    }}>

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && (
        <div className="text-center py-5">
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Spinner animation="border" variant="light" size="sm" />
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading policies…</div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="p-4">
          <div
            className="d-flex align-items-center gap-3 rounded-3 p-3"
            style={{ background: '#fff5f5', border: '1px solid #fca5a5' }}
          >
            <i className="bi bi-exclamation-triangle-fill text-danger fs-5 flex-shrink-0"></i>
            <div className="flex-grow-1 text-danger small">{error}</div>
            <button
              onClick={onRetry}
              style={{
                background: '#fee2e2', border: '1px solid #fca5a5',
                color: '#dc2626', borderRadius: 20, padding: '4px 14px',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && !error && policies.length === 0 && (
        <div className="text-center py-5">
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #f3f0ff, #faf5ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            border: '2px solid #ede9fe',
          }}>
            <i className="bi bi-inbox" style={{ fontSize: 28, color: '#7c3aed' }}></i>
          </div>
          <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            {hasFilters ? 'No policies match your filters' : 'No policies yet'}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginBottom: 16 }}>
            {hasFilters
              ? 'Try adjusting your search or status filter.'
              : 'Create your first insurance policy to get started.'}
          </div>
          {isAdmin && !hasFilters && (
            <button
              onClick={onCreateFirst}
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                border: 'none', color: 'white',
                borderRadius: 20, padding: '8px 20px',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              }}
            >
              <i className="bi bi-plus-lg me-2"></i>Create First Policy
            </button>
          )}
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {!loading && !error && policies.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 'max-content', width: '100%' }}>
            <HeaderRow isAdmin={isAdmin} isHospital={isHospital} />
            {policies.map((policy) => (
              <PolicyRow
                key={policy.policyID}
                policy={policy}
                isAdmin={isAdmin}
                isHospital={isHospital}
                onView={onView}
                onEdit={onEdit}
                onDeactivate={onDeactivate}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      {!loading && !error && policies.length > 0 && (
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid #f3f0ff',
          background: '#faf9ff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
            {policies.length} {policies.length === 1 ? 'policy' : 'policies'}
          </span>
          {onView && (
            <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
              <i className="bi bi-hand-index me-1"></i>Click a row to view full details
            </span>
          )}
        </div>
      )}

    </div>
  );
}
