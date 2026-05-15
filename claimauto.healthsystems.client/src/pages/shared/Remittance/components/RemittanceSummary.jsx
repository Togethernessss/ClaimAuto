import { Row, Col, Card, Alert } from 'react-bootstrap';
import { useAuth } from '../../../../security/AuthContext';
import { canAccess } from '../../../../security/permissions';

export default function RemittanceSummary({ remittances }) {
  const { user } = useAuth();
  const isHospital = canAccess(user?.role, ['Hospital']);

  const total     = remittances.length;
  const generated = remittances.filter(r => r.status === 'Generated').length;
  const sent      = remittances.filter(r => r.status === 'Sent').length;
  const acked     = remittances.filter(r => r.status === 'Acknowledged').length;

  const totalAmount = remittances
    .filter(r => r.status === 'Acknowledged' || r.status === 'Sent')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <>
      {/* Hospital alert banner */}
      {isHospital && sent > 0 && (
        <Alert
          variant="warning"
          className="d-flex align-items-center py-2 mb-3"
        >
          <i className="bi bi-bell-fill me-2"></i>
          <div>
            <div className="fw-semibold" style={{ fontSize: 13 }}>
              {sent} remittance{sent > 1 ? 's' : ''} awaiting your acknowledgement
            </div>
            <div style={{ fontSize: 11 }}>
              Please confirm receipt to close the payment loop with the insurer.
            </div>
          </div>
        </Alert>
      )}

      <Row className="g-3 mb-4" style={{ alignItems: 'stretch' }}>

        {/* Total */}
        <Col xs={6} lg={isHospital ? 4 : 3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center gap-3 py-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44, backgroundColor: '#e3f2fd' }}
              >
                <i className="bi bi-receipt fs-5" style={{ color: '#1565c0' }}></i>
              </div>
              <div>
                <div className="fw-bold fs-5 mb-0 lh-1">{total}</div>
                <div className="text-muted small">
                  {isHospital ? 'Total received' : 'Total'}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Generated — Admin/Staff only */}
        {!isHospital && (
          <Col xs={6} lg={3}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="d-flex align-items-center gap-3 py-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 44, height: 44, backgroundColor: '#e3f2fd' }}
                >
                  <i className="bi bi-hourglass-split fs-5" style={{ color: '#0C447C' }}></i>
                </div>
                <div>
                  <div className="fw-bold fs-5 mb-0 lh-1">{generated}</div>
                  <div className="text-muted small">Generated</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        )}

        {/* Sent / Pending ack */}
        <Col xs={6} lg={isHospital ? 4 : 3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center gap-3 py-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44, backgroundColor: '#fef3c7' }}
              >
                <i className="bi bi-send fs-5" style={{ color: '#633806' }}></i>
              </div>
              <div>
                <div className="fw-bold fs-5 mb-0 lh-1">{sent}</div>
                <div className="text-muted small">
                  {isHospital ? 'Pending ack.' : 'Sent'}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Acknowledged */}
        <Col xs={6} lg={isHospital ? 4 : 3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center gap-3 py-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44, backgroundColor: '#d1f2eb' }}
              >
                <i className="bi bi-check-circle fs-5" style={{ color: '#085041' }}></i>
              </div>
              <div>
                <div className="fw-bold fs-5 mb-0 lh-1">{acked}</div>
                <div className="text-muted small">Acknowledged</div>
                {totalAmount > 0 && (
                  <div style={{ fontSize: 10, color: '#9e9e9e' }}>
                    ₹{totalAmount.toLocaleString('en-IN')} total
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

      </Row>
    </>
  );
}