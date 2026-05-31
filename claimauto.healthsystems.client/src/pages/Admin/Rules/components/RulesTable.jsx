// src/pages/Admin/Rules/components/RulesTable.jsx
import { Card, Table, Button, Alert, Spinner } from 'react-bootstrap';
import { formatDate, ruleStatusStyle, ruleStatusIcon, ruleTypeStyle, ruleTypeIcon } from '../utils/ruleHelpers';

// Map template keys → human-readable labels for the Type column.
// Falls back to the raw value if unknown (e.g., custom rule type).
const TEMPLATE_LABELS = {
  PolicyActive:           'Policy Active',
  InNetwork:              'In-Network',
  WaitingPeriod:          'Waiting Period',
  CoverageRemaining:      'Coverage Remaining',
  AmountBelow:            'Auto-Approve Below',
  AmountAbove:            'Route Above Amount',
  AmountBetween:          'Amount in Range',
  ClaimTypeDeny:          'Deny by Type',
  ClaimTypePass:          'Auto-Pass by Type',
  DuplicateCheck:         'Duplicate Check',
  // ReimbursementDuplicate label removed — Reimbursement claim type no longer exists.
  Deductible:             'Deductible',
  CoPay:                  'CoPay',
  RequireDocType:         'Require Document',
  RouteToReview:          'Always Route',
};

function getTemplateLabel(ruleType) {
  return TEMPLATE_LABELS[ruleType] || ruleType;
}

// Build a short human-readable summary from the rule's condition JSON
// so admins see "Max: ₹5,000" instead of raw {"maxAmount":5000}.
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
    return parts.length > 0 ? parts.join(' • ') : null;
  } catch {
    return null;
  }
}

function StatusBadge({ status }) {
  const s = ruleStatusStyle(status);
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: 6,
      fontSize: 12, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      <i className={ruleStatusIcon(status)} style={{ fontSize: 10 }}></i>
      {status}
    </span>
  );
}

function TypeBadge({ type }) {
  const s = ruleTypeStyle(type);
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 500,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      <i className={ruleTypeIcon(type)} style={{ fontSize: 10 }}></i>
      {getTemplateLabel(type)}
    </span>
  );
}

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
  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <div className="mt-2 text-muted small">Loading rules...</div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Alert variant="danger" className="d-flex align-items-center mb-0">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
            <Button variant="link" size="sm" className="ms-auto p-0 text-danger" onClick={onRetry}>
              <i className="bi bi-arrow-clockwise me-1"></i> Retry
            </Button>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (rules.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <i className="bi bi-gear" style={{ fontSize: 48, color: '#dfe4ea' }}></i>
          <div className="fw-semibold text-muted mt-3">
            {hasFilters ? 'No rules match your filters' : 'No rules yet'}
          </div>
          <div className="small text-muted mt-1">
            {hasFilters
              ? 'Try clearing your filters.'
              : 'Create your first adjudication rule to get started.'}
          </div>
          {!hasFilters && (
            <Button
              variant="primary"
              size="sm"
              className="mt-3 rounded-pill"
              onClick={onCreateFirst}
            >
              <i className="bi bi-plus me-1"></i> Create First Rule
            </Button>
          )}
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover className="mb-0 align-middle">
            <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <tr>
                <th className="ps-4 py-3 text-muted small fw-semibold text-uppercase">Priority</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Rule Name</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Type</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Status</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Version</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Created By</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Created</th>
                <th className="py-3 pe-4 text-muted small fw-semibold text-uppercase text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.ruleID}>

                  {/* Priority */}
                  <td className="ps-4 py-3">
                    <div
                      className="d-inline-flex align-items-center justify-content-center rounded-circle fw-bold"
                      style={{
                        width: 32, height: 32,
                        background: '#f3f0ff',
                        color: '#764ba2',
                        fontSize: 13,
                      }}
                    >
                      {rule.priority}
                    </div>
                  </td>

                  {/* Name + description + params summary */}
                  <td className="py-3" style={{ maxWidth: 280 }}>
                    <div className="fw-semibold" style={{ fontSize: 13 }}>{rule.name}</div>
                    {rule.description && (
                      <div className="text-muted" style={{ fontSize: 11, lineHeight: 1.3 }}>
                        {rule.description}
                      </div>
                    )}
                    {getParamsSummary(rule) && (
                      <div
                        className="font-monospace mt-1"
                        style={{
                          fontSize: 10,
                          color: '#5a6268',
                          background: '#f0f2f5',
                          padding: '2px 6px',
                          borderRadius: 4,
                          display: 'inline-block',
                        }}
                      >
                        <i className="bi bi-sliders me-1"></i>
                        {getParamsSummary(rule)}
                      </div>
                    )}
                  </td>

                  {/* Type */}
                  <td className="py-3">
                    <TypeBadge type={rule.ruleType} />
                  </td>

                  {/* Status */}
                  <td className="py-3">
                    <StatusBadge status={rule.status} />
                  </td>

                  {/* Version */}
                  <td className="py-3">
                    <span className="font-monospace text-muted" style={{ fontSize: 12 }}>
                      v{rule.version}
                    </span>
                  </td>

                  {/* Created by */}
                  <td className="py-3 small text-muted">{rule.createdByName}</td>

                  {/* Created at */}
                  <td className="py-3 small text-muted">{formatDate(rule.createdAt)}</td>

                  {/* Actions */}
                  <td className="py-3 pe-4">
                    <div className="d-flex flex-column align-items-end gap-1">

                      {/* Edit — always available */}
                      <Button
                        size="sm"
                        onClick={() => onEdit(rule)}
                        style={{
                          width: 100, borderRadius: 6, fontWeight: 600, fontSize: '0.78rem',
                          background: '#e8f0fe', border: '1.5px solid #4285f4', color: '#1a56db',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 5, padding: '5px 0',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#4285f4'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#e8f0fe'; e.currentTarget.style.color = '#1a56db'; }}
                      >
                        <i className="bi bi-pencil-fill" style={{ fontSize: '0.72rem' }}></i>
                        Edit
                      </Button>

                      {/* Activate — Draft or Inactive */}
                      {(rule.status === 'Draft' || rule.status === 'Inactive') && (
                        <Button
                          size="sm"
                          onClick={() => onActivate(rule)}
                          style={{
                            width: 100, borderRadius: 6, fontWeight: 600, fontSize: '0.78rem',
                            background: '#d1f2eb', border: '1.5px solid #085041', color: '#085041',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 5, padding: '5px 0',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#085041'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#d1f2eb'; e.currentTarget.style.color = '#085041'; }}
                        >
                          <i className="bi bi-check-circle" style={{ fontSize: '0.72rem' }}></i>
                          Activate
                        </Button>
                      )}

                      {/* Deactivate — Active only */}
                      {rule.status === 'Active' && (
                        <Button
                          size="sm"
                          onClick={() => onDeactivate(rule)}
                          style={{
                            width: 100, borderRadius: 6, fontWeight: 600, fontSize: '0.78rem',
                            background: '#fff3e0', border: '1.5px solid #e65100', color: '#e65100',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 5, padding: '5px 0',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#e65100'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff3e0'; e.currentTarget.style.color = '#e65100'; }}
                        >
                          <i className="bi bi-pause-circle" style={{ fontSize: '0.72rem' }}></i>
                          Deactivate
                        </Button>
                      )}

                      {/* Delete — Draft only */}
                      {rule.status === 'Draft' && (
                        <Button
                          size="sm"
                          onClick={() => onDelete(rule)}
                          style={{
                            width: 100, borderRadius: 6, fontWeight: 600, fontSize: '0.78rem',
                            background: '#ffebee', border: '1.5px solid #ef5350', color: '#c62828',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 5, padding: '5px 0',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#ef5350'; e.currentTarget.style.color = '#fff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#ffebee'; e.currentTarget.style.color = '#c62828'; }}
                        >
                          <i className="bi bi-trash-fill" style={{ fontSize: '0.72rem' }}></i>
                          Delete
                        </Button>
                      )}

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
}
