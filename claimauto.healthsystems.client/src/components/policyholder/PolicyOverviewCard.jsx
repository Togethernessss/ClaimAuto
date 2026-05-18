import { Card, Row, Col, Badge } from 'react-bootstrap';
import {
  formatDate,
  formatCompactCurrency,
} from '../../data/policyholderDashboardData';

/**
 * Policy Hero Card — top-of-dashboard summary of the Policyholder's plan.
 * Receives the mapped policy object from dashboardService.js
 * + the count of enrolled family members.
 */
export default function PolicyOverviewCard({ policy, memberCount }) {
  if (!policy) return null;

  // Status badge color
  const statusVariant =
    policy.status === 'Active'    ? 'success' :
    policy.status === 'Expired'   ? 'danger'  :
    policy.status === 'Suspended' ? 'warning' :
                                    'secondary';

  return (
    <Card
      className="border-0 shadow-sm mb-3"
      style={{
        borderRadius: 14,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      }}
    >
      <Card.Body className="p-4">

        {/* ── Header row: plan name + status badge ─────────────────── */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className="bi bi-shield-check fs-3"></i>
              <h4 className="fw-bold mb-0">{policy.planName}</h4>
            </div>
            <code className="small opacity-75">{policy.planCode}</code>
          </div>

          <Badge
            bg={statusVariant}
            className="px-3 py-2 rounded-pill"
            style={{ fontSize: '0.85rem' }}
          >
            {policy.status}
          </Badge>
        </div>

        {/* ── Coverage highlight (big white inset card) ────────────── */}
        <div
          className="bg-white text-dark p-3 mb-3"
          style={{ borderRadius: 10 }}
        >
          <div className="small text-muted mb-1">
            <i className="bi bi-piggy-bank-fill me-1"></i>
            Total Annual Coverage
          </div>
          <div className="fs-2 fw-bold text-primary">
            {formatCompactCurrency(policy.coverageAmount)}
          </div>
        </div>

        {/* ── 4-cell detail grid ──────────────────────────────────── */}
        <Row className="g-3">

          <Col xs={6} md={3}>
            <div className="small opacity-75 mb-1">
              <i className="bi bi-cash-coin me-1"></i> Deductible
            </div>
            <div className="fw-semibold">
              {formatCompactCurrency(policy.deductibleAmount)}
            </div>
          </Col>

          <Col xs={6} md={3}>
            <div className="small opacity-75 mb-1">
              <i className="bi bi-graph-down me-1"></i> OOP Max
            </div>
            <div className="fw-semibold">
              {formatCompactCurrency(policy.outOfPocketMax)}
            </div>
          </Col>

          <Col xs={6} md={3}>
            <div className="small opacity-75 mb-1">
              <i className="bi bi-calendar-range me-1"></i> Effective
            </div>
            <div className="fw-semibold small">
              {formatDate(policy.effectiveFrom)}
              <br />
              → {formatDate(policy.effectiveTo)}
            </div>
          </Col>

          <Col xs={6} md={3}>
            <div className="small opacity-75 mb-1">
              <i className="bi bi-people-fill me-1"></i> Members
            </div>
            <div className="fw-semibold">
              {memberCount} enrolled
            </div>
          </Col>

        </Row>

      </Card.Body>
    </Card>
  );
}