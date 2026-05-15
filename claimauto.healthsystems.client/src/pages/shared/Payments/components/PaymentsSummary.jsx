import { Row, Col, Card } from 'react-bootstrap';

const STAT_CARDS = [
  { key: 'total',      label: 'Total Payments', icon: 'bi-credit-card',     bg: '#e3f2fd', color: '#1565c0' },
  { key: 'pending',    label: 'Pending',         icon: 'bi-hourglass-split', bg: '#fff3e0', color: '#e65100' },
  { key: 'authorized', label: 'Authorized',      icon: 'bi-check-circle',    bg: '#e8f5e9', color: '#2e7d32' },
  { key: 'executed',   label: 'Executed',         icon: 'bi-send-check',      bg: '#d1f2eb', color: '#1b5e20' },
];

export default function PaymentsSummary({ payments }) {
  const values = {
    total:      payments.length,
    pending:    payments.filter(p => p.status === 'Pending').length,
    authorized: payments.filter(p => p.status === 'Authorized').length,
    executed:   payments.filter(p => p.status === 'Executed').length,
  };

  const totalExecuted = payments
    .filter(p => p.status === 'Executed')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <Row className="g-3 mb-4">
      {STAT_CARDS.map((card) => (
        <Col xs={6} lg={3} key={card.key}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center gap-3 py-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44, backgroundColor: card.bg }}
              >
                <i className={`${card.icon} fs-5`} style={{ color: card.color }}></i>
              </div>
              <div>
                <div className="fw-bold fs-5 mb-0 lh-1">{values[card.key]}</div>
                <div className="text-muted small">{card.label}</div>
                {card.key === 'executed' && totalExecuted > 0 && (
                  <div style={{ fontSize: 10, color: '#9e9e9e' }}>
                    ₹{totalExecuted.toLocaleString('en-IN')} disbursed
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
}