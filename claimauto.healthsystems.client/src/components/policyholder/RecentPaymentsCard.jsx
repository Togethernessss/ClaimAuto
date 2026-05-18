import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button } from 'react-bootstrap';
import { formatCurrency, formatDate } from '../../data/policyholderDashboardData';

export default function RecentPaymentsCard({ payments }) {
  const navigate = useNavigate();
  const recent = payments.slice(0, 3);

  return (
    <Card className="border-0 shadow-sm" style={{ borderRadius: 12 }}>
      <Card.Header className="bg-white border-bottom d-flex align-items-center justify-content-between py-3">
        <div className="fw-bold d-flex align-items-center">
          <i className="bi bi-credit-card-fill text-primary me-2 fs-5"></i>
          <span>Recent Payments</span>
        </div>
        <Button
          size="sm"
          variant="outline-primary"
          className="rounded-pill"
          onClick={() => navigate('/payments')}
        >
          View All <i className="bi bi-arrow-right ms-1"></i>
        </Button>
      </Card.Header>

      <Card.Body className="p-0">
        {recent.length === 0 ? (
          <div className="text-center py-4 px-3">
            <i className="bi bi-cash-stack" style={{ fontSize: 32, color: '#dfe4ea' }}></i>
            <div className="text-muted small mt-2">No payments yet</div>
          </div>
        ) : recent.map((p, idx) => (
          <div
            key={p.paymentID}
            className={`d-flex align-items-center justify-content-between p-3 ${idx !== recent.length - 1 ? 'border-bottom' : ''}`}
            style={{ borderColor: '#f0f3f9' }}
          >
            <div>
              <div className="fw-semibold small">PAY-{p.paymentID}</div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                Claim CLM-{p.claimID} · {formatDate(p.paidAt)} · {p.mode}
              </div>
            </div>
            <div className="text-end">
              <div className="fw-bold text-success">{formatCurrency(p.amount)}</div>
              <Badge bg={p.status === 'Paid' ? 'success' : 'warning'} pill className="small">
                {p.status}
              </Badge>
            </div>
          </div>
        ))}
      </Card.Body>
    </Card>
  );
}