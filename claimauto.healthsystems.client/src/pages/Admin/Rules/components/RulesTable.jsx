// src/pages/Admin/Rules/components/RulesTable.jsx
import { Spinner } from 'react-bootstrap';
import { formatDate, ruleStatusStyle, ruleStatusIcon, ruleTypeStyle, ruleTypeIcon } from '../utils/ruleHelpers';

const TEMPLATE_LABELS = {
  PolicyActive:      'Policy Active',
  InNetwork:         'In-Network',
  WaitingPeriod:     'Waiting Period',
  CoverageRemaining: 'Coverage Remaining',
  AmountBelow:       'Auto-Approve Below',
  AmountAbove:       'Route Above Amount',
  AmountBetween:     'Amount in Range',
  ClaimTypeDeny:     'Deny by Type',
  ClaimTypePass:     'Auto-Pass by Type',
  DuplicateCheck:    'Duplicate Check',
  Deductible:        'Deductible',
  CoPay:             'CoPay',
  RequireDocType:    'Require Document',
  RouteToReview:     'Always Route',
};

function getTemplateLabel(ruleType) {
  return TEMPLATE_LABELS[ruleType] || ruleType;
}

function getParamsSummary(rule) {
  if (!rule?.conditionExpressionJSON) return null;
  try {
    const p = JSON.parse(rule.conditionExpressionJSON);
    if (!p || typeof p !== 'object') return null;
    const parts = [];
    if (p.minAmount !== undefined && p.minAmount !== null)
      parts.push(`Min: ₹${Number(p.minAmount).toLocaleString('en-IN')}`);
    if (p.maxAmount !== undefined && p.maxAmount !== null)
      parts.push(`Max: ₹${Number(p.maxAmount).toLocaleString('en-IN')}`);
    if (p.windowDays) parts.push(`${p.windowDays}-day window`);
    if (p.days)       parts.push(`${p.days} days`);
    if (p.percent)    parts.push(`${p.percent}%`);
    if (Array.isArray(p.types) && p.types.length > 0)
      parts.push(`Types: ${p.types.join(', ')}`);
    if (Array.isArray(p.requiredTypes) && p.requiredTypes.length > 0)
      parts.push(`Required: ${p.requiredTypes.join(', ')}`);
    return parts.length > 0 ? parts.join(' · ') : null;
  } catch {
    return null;
  }
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const s = ruleStatusStyle(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: s.bg, color: s.color,
      padding: '3px 9px', borderRadius: 999,
      fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <i className={ruleStatusIcon(status)} style={{ fontSize: 8 }}></i>
      {status}
    </span>
  );
}

// ── Type badge ────────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const s = ruleTypeStyle(type);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: s.bg, color: s.color,
      padding: '3px 9px', borderRadius: 999,
      fontSize: '0.71rem', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <i className={ruleTypeIcon(type)} style={{ fontSize: 8 }}></i>
      {getTemplateLabel(type)}
    </span>
  );
}

// ── Compact action button (full width, stacked vertically) ────────────────────
function ActionBtn({ label, icon, bg, color, border, hoverBg, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '5px 0',
        borderRadius: 7,
        border,
        background: bg,
        color,
        fontWeight: 700,
        fontSize: '0.72rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background  = hoverBg;
        e.currentTarget.style.color       = 'white';
        e.currentTarget.style.borderColor = hoverBg;
        e.currentTarget.style.transform   = 'translateY(-1px)';
        e.currentTarget.style.boxShadow   = `0 3px 8px ${hoverBg}55`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background  = bg;
        e.currentTarget.style.color       = color;
        e.currentTarget.style.borderColor = border.replace('1.5px solid ', '');
        e.currentTarget.style.transform   = 'translateY(0)';
        e.currentTarget.style.boxShadow   = 'none';
      }}
    >
      <i className={`bi ${icon}`} style={{ fontSize: '0.68rem' }}></i>
      {label}
    </button>
  );
}

// ── Column config ─────────────────────────────────────────────────────────────
//  60px | 1fr | 150px | 105px | 60px | 110px | 105px | 115px
//  The rule-name column (1fr) absorbs leftover space.
//  The actions column is intentionally narrower — buttons stack vertically.
const GRID = '60px 1fr 150px 105px 60px 110px 105px 115px';

export default function RulesTable({
  rules,
  loading,
  error,
  hasFilters,
  onRetry,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
  onCreateFirst,
}) {

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
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
        <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading rules…</div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: '#fff5f5', border: '1px solid #fca5a5',
        borderRadius: 14, padding: '16px 20px',
      }}>
        <i className="bi bi-exclamation-triangle-fill"
           style={{ color: '#dc2626', fontSize: 18, flexShrink: 0 }}></i>
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
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (rules.length === 0) {
    return (
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
          <i className="bi bi-cpu" style={{ fontSize: '1.8rem', color: '#7c3aed' }}></i>
        </div>
        <div style={{ fontWeight: 700, color: '#374151', marginBottom: 4, fontSize: '0.95rem' }}>
          {hasFilters ? 'No rules match your filters' : 'No rules yet'}
        </div>
        <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginBottom: !hasFilters ? 16 : 0 }}>
          {hasFilters
            ? 'Try clearing your filters.'
            : 'Create your first adjudication rule to get started.'}
        </div>
        {!hasFilters && (
          <button onClick={onCreateFirst} style={{
            padding: '8px 20px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white', fontWeight: 700, fontSize: '0.83rem',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 12px rgba(102,126,234,0.35)',
          }}>
            <i className="bi bi-plus-lg"></i>Create First Rule
          </button>
        )}
      </div>
    );
  }

  // ── Table ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      boxShadow: '0 2px 12px rgba(102,126,234,0.10)',
      overflow: 'hidden',
    }}>

      {/* Horizontal scroll wrapper */}
      <div style={{ overflowX: 'auto' }}>

        {/* ── Gradient header ─────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: GRID,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '11px 18px',
          minWidth: 860,
        }}>
          {[
            'Priority', 'Rule Name', 'Type',
            'Status', 'Ver.', 'Created By', 'Created', 'Actions',
          ].map((h, i) => (
            <div key={h} style={{
              fontSize: '0.69rem',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              textAlign: i === 7 ? 'center' : 'left',
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* ── Data rows ───────────────────────────────────── */}
        {rules.map((rule, idx) => {
          const paramsSummary = getParamsSummary(rule);
          const isLast        = idx === rules.length - 1;

          // How many action buttons will this row have?
          const actionCount =
            1 +                                                             // Edit (always)
            (rule.status === 'Draft' || rule.status === 'Inactive' ? 1 : 0) + // Activate
            (rule.status === 'Active'                               ? 1 : 0) + // Deactivate
            (rule.status === 'Draft'                                ? 1 : 0);  // Delete

          return (
            <div
              key={rule.ruleID}
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                padding: '12px 18px',
                minWidth: 860,
                alignItems: 'center',
                borderBottom: isLast ? 'none' : '1px solid #f3f0ff',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#faf9ff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >

              {/* ── Priority ─────────────────────────────────── */}
              <div>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                  border: '2px solid #ddd6fe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.82rem', color: '#7c3aed',
                }}>
                  {rule.priority}
                </div>
              </div>

              {/* ── Rule Name + description + params ─────────── */}
              <div style={{ paddingRight: 10 }}>
                <div style={{
                  fontWeight: 700, color: '#1e1b4b',
                  fontSize: '0.86rem', marginBottom: 2,
                }}>
                  {rule.name}
                </div>
                {rule.description && (
                  <div style={{
                    fontSize: '0.71rem', color: '#6b7280', lineHeight: 1.4,
                  }}>
                    {rule.description}
                  </div>
                )}
                {paramsSummary && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    marginTop: 4, fontSize: '0.67rem', fontFamily: 'monospace',
                    color: '#5b21b6', background: '#f3f0ff',
                    padding: '2px 7px', borderRadius: 5,
                  }}>
                    <i className="bi bi-sliders" style={{ fontSize: 8 }}></i>
                    {paramsSummary}
                  </div>
                )}
              </div>

              {/* ── Type ─────────────────────────────────────── */}
              <div>
                <TypeBadge type={rule.ruleType} />
              </div>

              {/* ── Status ───────────────────────────────────── */}
              <div>
                <StatusPill status={rule.status} />
              </div>

              {/* ── Version ──────────────────────────────────── */}
              <div>
                <span style={{
                  fontFamily: 'monospace', fontSize: '0.77rem', fontWeight: 700,
                  color: '#9ca3af', background: '#f3f4f6',
                  padding: '2px 7px', borderRadius: 6,
                }}>
                  v{rule.version}
                </span>
              </div>

              {/* ── Created By ───────────────────────────────── */}
              <div style={{ fontSize: '0.81rem', color: '#374151' }}>
                <i className="bi bi-person"
                   style={{ color: '#9ca3af', fontSize: 10, marginRight: 4 }}></i>
                {rule.createdByName}
              </div>

              {/* ── Created At ───────────────────────────────── */}
              <div style={{ fontSize: '0.77rem', color: '#6b7280' }}>
                <i className="bi bi-calendar3"
                   style={{ fontSize: 9, color: '#9ca3af', marginRight: 4 }}></i>
                {formatDate(rule.createdAt)}
              </div>

              {/* ── Actions (stacked vertically) ─────────────── */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: actionCount > 1 ? 5 : 0,
                alignItems: 'stretch',
                minWidth: 0,
              }}>

                {/* Edit — always */}
                <ActionBtn
                  label="Edit"
                  icon="bi-pencil-fill"
                  bg="#eff6ff"        color="#1d4ed8"
                  border="1.5px solid #93c5fd"
                  hoverBg="#2563eb"
                  onClick={() => onEdit(rule)}
                />

                {/* Activate — Draft or Inactive */}
                {(rule.status === 'Draft' || rule.status === 'Inactive') && (
                  <ActionBtn
                    label="Activate"
                    icon="bi-check-circle-fill"
                    bg="#f0fdf4"       color="#15803d"
                    border="1.5px solid #86efac"
                    hoverBg="#16a34a"
                    onClick={() => onActivate(rule)}
                  />
                )}

                {/* Deactivate — Active only */}
                {rule.status === 'Active' && (
                  <ActionBtn
                    label="Deactivate"
                    icon="bi-pause-circle-fill"
                    bg="#fff7ed"       color="#c2410c"
                    border="1.5px solid #fdba74"
                    hoverBg="#ea580c"
                    onClick={() => onDeactivate(rule)}
                  />
                )}

                {/* Delete — Draft only */}
                {rule.status === 'Draft' && (
                  <ActionBtn
                    label="Delete"
                    icon="bi-trash3-fill"
                    bg="#fff5f5"       color="#dc2626"
                    border="1.5px solid #fca5a5"
                    hoverBg="#ef4444"
                    onClick={() => onDelete(rule)}
                  />
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <div style={{
        padding: '10px 18px',
        borderTop: '1px solid #f3f0ff',
        background: '#faf9ff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {rules.length} rule{rules.length !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
          <i className="bi bi-sort-numeric-down me-1"></i>Sorted by priority
        </span>
      </div>
    </div>
  );
}
