import { Card, ProgressBar, Row, Col } from 'react-bootstrap';
import { formatCurrency, calculateCoverageUsed } from '../../data/policyholderDashboardData';

export default function CoverageUtilization({ policy, claims }) {
  if (!policy) return null;

  const used = calculateCoverageUsed(claims);
  const total = policy.coverageAmount || 1;
  const percent = Math.min(100, Math.round((used / total) * 100));
  const remaining = Math.max(0, total - used);

  let variant = 'success';
  let textColor = '#2e7d32';
  if (percent > 80) { variant = 'danger';  textColor = '#c0392b'; }
  else if (percent > 60) { variant = 'warning'; textColor = '#e65100'; }

  return (
    <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: 12 }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h6 className="fw-bold mb-0">
              <i className="bi bi-pie-chart-fill text-primary me-2"></i>
              Coverage Utilization
            </h6>
            <small className="text-muted">How much of your annual coverage you've used so far</small>
          </div>
          <div className="text-end">
            <div className="fw-bold" style={{ fontSize: '1.6rem', color: textColor, lineHeight: 1 }}>{percent}%</div>
            <small className="text-muted">used</small>
          </div>
        </div>

        <ProgressBar now={percent} variant={variant} style={{ height: 12, borderRadius: 6 }} animated />

        <Row className="mt-3 g-3">
          <Col xs={4}>
            <div className="text-center p-2 rounded" style={{ background: '#f8f9fa' }}>
              <small className="text-muted d-block">Used</small>
              <strong className="d-block">{formatCurrency(used)}</strong>
            </div>
          </Col>
          <Col xs={4}>
            <div className="text-center p-2 rounded" style={{ background: '#e8f5e9' }}>
              <small className="text-muted d-block">Remaining</small>
              <strong className="d-block text-success">{formatCurrency(remaining)}</strong>
            </div>
          </Col>
          <Col xs={4}>
            <div className="text-center p-2 rounded" style={{ background: '#f8f9fa' }}>
              <small className="text-muted d-block">Total</small>
              <strong className="d-block">{formatCurrency(total)}</strong>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}