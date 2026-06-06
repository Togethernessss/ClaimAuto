// src/pages/shared/Policies/components/PolicyDetailModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// NEW — shown when any user clicks a policy row.
// Displays full policy details.  Admin gets Edit + Deactivate buttons.
// ─────────────────────────────────────────────────────────────────────────────
import { Modal } from 'react-bootstrap';
import { formatCurrency, formatDate } from '../utils/policyHelpers';

export default function PolicyDetailModal({
  show,          // boolean
  policy,        // policy object | null
  onHide,        // function
  isAdmin,       // boolean — show action buttons
  onEdit,        // function(policy)
  onDeactivate,  // function(policy)
}) {
  if (!policy) return null;

  // ── Status pill config ──────────────────────────────────────────────────────
  const statusCfg = {
    Active:    { dot: '#10b981', bg: '#d1fae5', text: '#065f46' },
    Expired:   { dot: '#9ca3af', bg: '#f3f4f6', text: '#4b5563' },
    Suspended: { dot: '#f59e0b', bg: '#fef3c7', text: '#92400e' },
  }[policy.status] ?? { dot: '#9ca3af', bg: '#f3f4f6', text: '#4b5563' };

  // ── Parse coverage rules ────────────────────────────────────────────────────
  let parsedRules = null;
  if (policy.coverageRulesJSON) {
    try { parsedRules = JSON.parse(policy.coverageRulesJSON); } catch { /* raw fallback */ }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold d-flex align-items-center gap-2">
          <div style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            borderRadius: 10, padding: '6px 8px',
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}>
            <i className="bi bi-shield-check text-white" style={{ fontSize: 18 }}></i>
          </div>
          <span style={{ fontSize: '1.05rem', color: '#1f2937' }}>{policy.planName}</span>
        </Modal.Title>
      </Modal.Header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <Modal.Body className="pt-2">

        {/* Status + plan code + member count */}
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: statusCfg.bg, color: statusCfg.text,
            padding: '4px 12px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusCfg.dot }} />
            {policy.status}
          </span>
          <span style={{
            fontFamily: 'monospace', fontSize: '0.82rem', color: '#6b7280',
            background: '#f3f4f6', padding: '3px 10px', borderRadius: 6,
          }}>
            {policy.planCode}
          </span>
          {policy.memberCount != null && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              marginLeft: 'auto', background: '#ede9fe',
              color: '#5b21b6', padding: '4px 12px', borderRadius: 999,
              fontSize: '0.8rem', fontWeight: 600,
            }}>
              <i className="bi bi-people-fill" style={{ fontSize: '0.78rem' }}></i>
              {policy.memberCount} Enrolled
            </span>
          )}
        </div>

        {/* Details grid */}
        <div className="rounded-3 mb-3" style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
          {[
            { label: 'Plan Name',      value: policy.planName,                     icon: 'bi-shield-check'   },
            { label: 'Plan Code',      value: policy.planCode,                     icon: 'bi-tag'            },
            { label: 'Sum Insured',    value: formatCurrency(policy.sumInsured),   icon: 'bi-cash-coin'      },
            { label: 'Deductible',     value: formatCurrency(policy.deductibleAmount), icon: 'bi-dash-circle' },
            { label: 'Effective From', value: formatDate(policy.effectiveFrom),    icon: 'bi-calendar-check' },
            {
              label: 'Effective To',
              value: formatDate(policy.effectiveTo) || (
                <span style={{ color: '#10b981', fontWeight: 600 }}>Ongoing</span>
              ),
              icon: 'bi-calendar-x',
            },
            policy.memberCount != null ? {
              label: 'Members Enrolled',
              value: `${policy.memberCount} member${policy.memberCount !== 1 ? 's' : ''}`,
              icon: 'bi-people',
            } : null,
          ].filter(Boolean).map((row, idx, arr) => (
            <div
              key={row.label}
              className="d-flex align-items-start justify-content-between px-3"
              style={{
                padding: '10px 12px',
                borderBottom: idx < arr.length - 1 ? '1px solid #e9ecef' : 'none',
              }}
            >
              <div
                className="d-flex align-items-center gap-2 text-muted"
                style={{ fontSize: '0.8rem', minWidth: 145 }}
              >
                <i className={`bi ${row.icon}`} style={{ fontSize: '0.75rem' }}></i>
                {row.label}
              </div>
              <div
                className="fw-semibold text-end"
                style={{ fontSize: '0.85rem', maxWidth: '60%', wordBreak: 'break-word' }}
              >
                {row.value ?? '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Coverage Rules */}
        {policy.coverageRulesJSON && (
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              <i className="bi bi-list-check me-2 text-primary"></i>Coverage Rules
            </div>

            {/* Array of rule objects */}
            {Array.isArray(parsedRules) && parsedRules.length > 0 ? (
              <div className="d-flex flex-column gap-1">
                {parsedRules.map((rule, i) => {
                  const name = rule.RuleName ?? rule.ruleName ?? rule.name ?? `Rule ${i + 1}`;
                  const desc = rule.Description ?? rule.description ?? rule.value ?? null;
                  return (
                    <div
                      key={i}
                      className="d-flex align-items-start gap-2 px-3 py-2 rounded"
                      style={{ background: '#f0f4ff', border: '1px solid #e0e7ff', fontSize: '0.82rem' }}
                    >
                      <i className="bi bi-check2-circle text-primary flex-shrink-0" style={{ marginTop: 2 }}></i>
                      <div>
                        <div className="fw-semibold" style={{ color: '#1e40af' }}>{name}</div>
                        {desc && <div style={{ color: '#6b7280', marginTop: 1 }}>{desc}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

            /* Key-value object */
            ) : parsedRules && typeof parsedRules === 'object' && !Array.isArray(parsedRules) ? (
              <div className="d-flex flex-column gap-1">
                {Object.entries(parsedRules).map(([k, v]) => (
                  <div
                    key={k}
                    className="d-flex justify-content-between px-3 py-2 rounded"
                    style={{ background: '#f0f4ff', border: '1px solid #e0e7ff', fontSize: '0.82rem' }}
                  >
                    <span className="fw-semibold text-muted">{k}</span>
                    <span style={{ color: '#1e40af', fontWeight: 500 }}>{String(v)}</span>
                  </div>
                ))}
              </div>

            /* Raw / unparseable JSON */
            ) : (
              <pre style={{
                background: '#f8f9fa', border: '1px solid #e9ecef',
                borderRadius: 8, padding: '10px 12px',
                fontSize: '0.75rem', color: '#374151',
                whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0,
              }}>
                {policy.coverageRulesJSON}
              </pre>
            )}
          </div>
        )}

      </Modal.Body>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <Modal.Footer className="border-0 pt-0 gap-2">

        {/* Admin action buttons — Edit and Deactivate */}
        {isAdmin && policy.status !== 'Expired' && (
          <>
            <button
              className="btn btn-outline-primary rounded-pill px-3 me-auto"
              style={{ fontWeight: 600, fontSize: '0.85rem' }}
              onClick={() => {
                onHide();
                // Small delay so modal closes before edit modal opens
                setTimeout(() => onEdit?.(policy), 100);
              }}
            >
              <i className="bi bi-pencil-fill me-2"></i>Edit Policy
            </button>

            {(policy.status === 'Active' || policy.status === 'Suspended') && (
              <button
                className="btn btn-outline-danger rounded-pill px-3"
                style={{ fontWeight: 600, fontSize: '0.85rem' }}
                onClick={() => {
                  onHide();
                  setTimeout(() => onDeactivate?.(policy), 100);
                }}
              >
                <i className="bi bi-slash-circle me-2"></i>
                {policy.status === 'Active' ? 'Deactivate' : 'Expire'}
              </button>
            )}
          </>
        )}

        <button
          className="btn btn-light rounded-pill px-4"
          style={{ fontSize: '0.85rem' }}
          onClick={onHide}
        >
          Close
        </button>
      </Modal.Footer>

    </Modal>
  );
}
