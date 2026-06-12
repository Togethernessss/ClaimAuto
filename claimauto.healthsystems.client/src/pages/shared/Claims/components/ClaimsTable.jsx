// src/pages/shared/Claims/components/ClaimsTable.jsx
import { Spinner } from 'react-bootstrap';
import {
  formatDate, formatCurrency,
  statusLabel,
  claimTypeIcon,
} from '../utils/claimHelpers';

// ── Status styling ───────────────────────────────────────────────────────────
const STATUS_STYLE = {
  Submitted:               { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' },
  DocsVerificationPending: { bg: '#e0f2fe', color: '#0369a1', dot: '#0ea5e9' },
  UnderReview:             { bg: '#fef9c3', color: '#854d0e', dot: '#f59e0b' },
  Approved:                { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
  Paid:                    { bg: '#d1fae5', color: '#064e3b', dot: '#059669' },
  Rejected:                { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
};

// ── Priority styling ─────────────────────────────────────────────────────────
const PRIORITY_STYLE = {
  Low:    { color: '#15803d', dot: '#22c55e' },
  Normal: { color: '#6b7280', dot: '#d1d5db' },
  High:   { color: '#c2410c', dot: '#f97316' },
  Urgent: { color: '#b91c1c', dot: '#ef4444' },
};

// ── Claim-type colors ────────────────────────────────────────────────────────
const TYPE_COLOR = {
  Inpatient:    { bg: '#ede9fe', color: '#5b21b6' },
  Outpatient:   { bg: '#e0f2fe', color: '#0369a1' },
  Emergency:    { bg: '#fee2e2', color: '#b91c1c' },
  // Reimbursement entry removed — claim type no longer exists.
};

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] ?? { bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' };
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          5,
      background:   s.bg,
      color:        s.color,
      fontSize:     '0.72rem',
      fontWeight:   700,
      padding:      '3px 10px',
      borderRadius: 20,
      whiteSpace:   'nowrap',
      letterSpacing:'0.2px',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: s.dot, flexShrink: 0,
      }} />
      {statusLabel(status)}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const p = PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.Normal;
  return (
    <span style={{
      display:    'inline-flex',
      alignItems: 'center',
      gap:        5,
      fontSize:   '0.72rem',
      fontWeight: 600,
      color:      p.color,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: p.dot, flexShrink: 0,
        boxShadow: priority === 'Urgent' ? `0 0 4px ${p.dot}` : 'none',
      }} />
      {priority}
    </span>
  );
}

function TypeChip({ claimType }) {
  const t = TYPE_COLOR[claimType] ?? { bg: '#f3f4f6', color: '#374151' };
  const icon = claimTypeIcon(claimType);
  return (
    <span style={{
      display:      'inline-flex',
      alignItems:   'center',
      gap:          5,
      background:   t.bg,
      color:        t.color,
      fontSize:     '0.72rem',
      fontWeight:   600,
      padding:      '3px 9px',
      borderRadius: 20,
      whiteSpace:   'nowrap',
    }}>
      <i className={`bi ${icon}`} style={{ fontSize: '0.7rem' }}></i>
      {claimType}
    </span>
  );
}

function ActionBtn({ onClick, title, icon, hoverBg, color, hoverColor }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width:          30, height: 30,
        borderRadius:   8,
        border:         'none',
        background:     'transparent',
        color:          color,
        cursor:         'pointer',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       '0.8rem',
        transition:     'background 0.15s, color 0.15s, transform 0.12s',
        flexShrink:     0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hoverBg;
        e.currentTarget.style.color      = hoverColor ?? color;
        e.currentTarget.style.transform  = 'scale(1.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color      = color;
        e.currentTarget.style.transform  = 'scale(1)';
      }}
    >
      <i className={`bi ${icon}`}></i>
    </button>
  );
}

export default function ClaimsTable({
  claims,
  loading,
  error,
  isAdmin,
  isStaff,
  isHospital,
  isPolicyholder,
  hasFilters,
  onRetry,
  onView,
  onUpdateStatus,
  onDelete,
}) {
  const canUpdate     = isAdmin || isStaff;
  const canDelete     = isAdmin || isHospital;
  const finalStatuses = ['Rejected', 'Approved', 'Paid'];

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        background:   'white',
        borderRadius: 16,
        boxShadow:    '0 4px 24px rgba(0,0,0,0.07)',
        overflow:     'hidden',
      }}>
        {/* Skeleton header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          height:     48,
        }} />
        <div className="text-center py-5">
          <Spinner
            animation="border"
            style={{ color: '#7c3aed', width: 36, height: 36, borderWidth: 3 }}
          />
          <div className="mt-3" style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>
            Loading claims…
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        background:   'white',
        borderRadius: 16,
        boxShadow:    '0 4px 24px rgba(0,0,0,0.07)',
        padding:      '28px 24px',
        textAlign:    'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: '#fef2f2', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <i className="bi bi-exclamation-triangle-fill"
            style={{ color: '#ef4444', fontSize: '1.4rem' }}></i>
        </div>
        <div style={{ fontWeight: 700, color: '#111827', marginBottom: 6 }}>{error}</div>
        <button
          onClick={onRetry}
          style={{
            padding: '7px 20px', borderRadius: 8,
            border: '1.5px solid #a78bfa',
            background: '#f5f3ff', color: '#7c3aed',
            fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <i className="bi bi-arrow-clockwise"></i> Retry
        </button>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (claims.length === 0) {
    return (
      <div style={{
        background:   'white',
        borderRadius: 16,
        boxShadow:    '0 4px 24px rgba(0,0,0,0.07)',
        padding:      '44px 24px',
        textAlign:    'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#f5f3ff', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <i className="bi bi-folder2"
            style={{ color: '#a78bfa', fontSize: '1.8rem' }}></i>
        </div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#374151', marginBottom: 6 }}>
          {hasFilters ? 'No claims match your filters' : 'No claims yet'}
        </div>
        <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
          {hasFilters
            ? 'Try clearing your filters to see all claims.'
            : isHospital
            ? 'Submit your first claim using the button above.'
            : isPolicyholder
            ? 'Your claims will appear here once submitted.'
            : 'Claims will appear here once submitted.'}
        </div>
      </div>
    );
  }

  // ── Table ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background:   'white',
      borderRadius: 16,
      boxShadow:    '0 4px 24px rgba(0,0,0,0.07)',
      overflow:     'hidden',
    }}>

      {/* ── Scrollable area — prevents Actions column from being clipped when
           the sidebar is open and the viewport is narrow ─────────────────── */}
      <div style={{ overflowX: 'auto' }}>
        {/* min-width: max-content makes this div exactly as wide as its grid
            content so the scroll container always knows when to scroll */}
        <div style={{ minWidth: 'max-content' }}>

          {/* ── Gradient header row ────────────────────────────────────── */}
          <div style={{
            background:          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding:             '0 20px',
            display:             'grid',
            gridTemplateColumns: buildColumns(isAdmin, isStaff),
            alignItems:          'center',
            height:              48,
            gap:                 12,
          }}>
            {HEADER_COLS(isAdmin, isStaff).map((col) => (
              <div key={col} style={{
                color:         'rgba(255,255,255,0.78)',
                fontSize:      '0.68rem',
                fontWeight:    700,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                whiteSpace:    'nowrap',
              }}>
                {col}
              </div>
            ))}
          </div>

          {/* ── Rows ─────────────────────────────────────────────────── */}
          <div>
            {claims.map((claim, idx) => (
              <ClaimRow
                key={claim.claimID}
                claim={claim}
                idx={idx}
                isAdmin={isAdmin}
                isStaff={isStaff}
                isHospital={isHospital}
                canUpdate={canUpdate}
                canDelete={canDelete}
                finalStatuses={finalStatuses}
                onView={onView}
                onUpdateStatus={onUpdateStatus}
                onDelete={onDelete}
              />
            ))}
          </div>

        </div>
      </div>

      {/* ── Footer count — always visible, outside scroll area ────────────── */}
      <div style={{
        borderTop:      '1px solid #f1f5f9',
        padding:        '10px 20px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'flex-end',
        gap:            6,
      }}>
        <i className="bi bi-list-ul" style={{ color: '#a78bfa', fontSize: '0.8rem' }}></i>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
          Showing <strong style={{ color: '#667eea' }}>{claims.length}</strong> claim{claims.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function buildColumns(isAdmin, isStaff) {
  const withProvider = isAdmin || isStaff;
  if (withProvider) {
    // Claim | Member | Provider | Type | Amount | Status | Priority | Submitted | Actions
    // Tightened so all 9 columns fit within ~1150px (viewport with sidebar)
    return '130px 155px 115px 110px 105px 125px 88px 100px 88px';
  }
  // Claim | Member | Type | Amount | Status | Priority | Submitted | Actions
  return '130px 175px 110px 105px 125px 88px 100px 88px';
}

function HEADER_COLS(isAdmin, isStaff) {
  const base = ['Claim', 'Member'];
  if (isAdmin || isStaff) base.push('Provider');
  base.push('Type', 'Amount', 'Status', 'Priority', 'Submitted', 'Actions');
  return base;
}

function ClaimRow({
  claim, idx,
  isAdmin, isStaff, isHospital,
  canUpdate, canDelete, finalStatuses,
  onView, onUpdateStatus, onDelete,
}) {
  const withProvider = isAdmin || isStaff;
  const canDeleteThis =
    canDelete && (
      claim.status === 'Rejected' ||
      (claim.status === 'Submitted' && (isAdmin || isHospital))
    );
  const canUpdateThis = canUpdate && !finalStatuses.includes(claim.status);

  return (
    <div
      onClick={() => onView(claim)}
      style={{
        display:         'grid',
        gridTemplateColumns: buildColumns(isAdmin, isStaff),
        alignItems:      'center',
        padding:         '13px 20px',
        gap:             12,
        borderBottom:    '1px solid #f1f5f9',
        background:      'white',
        transition:      'background 0.12s',
        cursor:          'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f5f3ff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'white';
      }}
    >
      {/* Claim ID */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily:    'monospace',
          fontWeight:    700,
          fontSize:      '0.82rem',
          color:         '#4c1d95',
          letterSpacing: '0.2px',
          whiteSpace:    'nowrap',
        }}>
          CLM-{claim.claimID}
        </div>
        {claim.externalClaimRef && (
          <div style={{
            fontSize:     '0.68rem',
            color:        '#94a3b8',
            marginTop:    1,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {claim.externalClaimRef}
          </div>
        )}
      </div>

      {/* Member */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize:     '0.82rem',
          fontWeight:   600,
          color:        '#1e293b',
          whiteSpace:   'nowrap',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
        }}>
          {claim.memberName}
        </div>
        <div style={{
          fontSize:     '0.68rem',
          color:        '#94a3b8',
          marginTop:    1,
          whiteSpace:   'nowrap',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
        }}>
          {claim.policyName}
        </div>
      </div>

      {/* Provider (admin/staff) */}
      {withProvider && (
        <div style={{
          fontSize:     '0.8rem',
          color:        '#374151',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          minWidth:     0,
        }}>
          {claim.providerName ?? '—'}
        </div>
      )}

      {/* Type */}
      <div>
        <TypeChip claimType={claim.claimType} />
      </div>

      {/* Amount */}
      <div style={{
        fontSize:   '0.84rem',
        fontWeight: 700,
        color:      '#1e293b',
        whiteSpace: 'nowrap',
      }}>
        {formatCurrency(claim.totalBilledAmount)}
      </div>

      {/* Status */}
      <div>
        <StatusPill status={claim.status} />
      </div>

      {/* Priority */}
      <div>
        <PriorityBadge priority={claim.priority} />
      </div>

      {/* Submitted date */}
      <div style={{
        fontSize: '0.75rem',
        color:    '#94a3b8',
        whiteSpace: 'nowrap',
      }}>
        {formatDate(claim.submittedAt)}
      </div>

      {/* Actions */}
      <div style={{
        display:    'flex',
        alignItems: 'center',
        gap:        2,
      }}>
        {/* View */}
        <ActionBtn
          onClick={(e) => { e.stopPropagation(); onView(claim); }}
          title="View claim details"
          icon="bi-eye-fill"
          color="#3b82f6"
          hoverBg="#dbeafe"
        />

        {/* Update status */}
        {canUpdateThis && (
          <ActionBtn
            onClick={(e) => { e.stopPropagation(); onUpdateStatus(claim); }}
            title="Update status"
            icon="bi-pencil-fill"
            color="#d97706"
            hoverBg="#fef9c3"
          />
        )}

        {/* Delete */}
        {canDeleteThis && (
          <ActionBtn
            onClick={(e) => { e.stopPropagation(); onDelete(claim); }}
            title="Delete claim"
            icon="bi-trash3-fill"
            color="#ef4444"
            hoverBg="#fee2e2"
          />
        )}
      </div>
    </div>
  );
}
