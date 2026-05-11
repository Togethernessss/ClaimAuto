import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import { getMenuForRole } from '../../security/permissions';


export default function HospitalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  
  const myMenu = getMenuForRole(user.role).filter((m) => m.key !== 'dashboard');

  // TODO: replace with real API calls when ready
  //   stats        → GET /api/claims?providerId=me + GET /api/payments?payeeId=me
  //   remittances  → GET /api/payments?payeeId=me&status=Executed
  //   submissions  → GET /api/claims?providerId=me (last 5)

  return (
    <Container fluid>
      {/* ── Welcome banner with action buttons ──────────────────────────────── */}
      <div
        className="text-white p-4 p-md-5 rounded-3 mb-4 shadow-sm d-flex justify-content-between align-items-center flex-wrap gap-3"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div>
          <h2 className="fw-bold mb-2">Welcome, {user?.name}! 🏥</h2>
          <p className="mb-0 opacity-75">
            Submit claims, track payments, and acknowledge remittances all in one place.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="light"
            size="sm"
            onClick={() => navigate('/claims/bulk-upload')}
          >
            <i className="bi bi-upload me-1"></i> Bulk Upload
          </Button>
          <Button
            variant="warning"
            size="sm"
            onClick={() => navigate('/claims/submit')}
          >
            <i className="bi bi-plus-lg me-1"></i> New Claim
          </Button>
        </div>
      </div>

      {/* ── Quick stats row (empty states for now) ──────────────────────────── */}
      <Row className="g-3 mb-4">
        <Col md={6} lg={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-muted small mb-1">Claims This Month</div>
                  <div className="fs-3 fw-bold text-muted">—</div>
                  <div className="small text-muted">No data yet</div>
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 44, height: 44, backgroundColor: '#e3f2fd' }}
                >
                  <i className="bi bi-file-earmark-text text-primary fs-5"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-muted small mb-1">Approval Rate</div>
                  <div className="fs-3 fw-bold text-muted">—</div>
                  <div className="small text-muted">Awaiting data</div>
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 44, height: 44, backgroundColor: '#d1f2eb' }}
                >
                  <i className="bi bi-check-circle text-success fs-5"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-muted small mb-1">Pending Review</div>
                  <div className="fs-3 fw-bold text-muted">—</div>
                  <div className="small text-muted">No pending claims</div>
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 44, height: 44, backgroundColor: '#fef5e7' }}
                >
                  <i className="bi bi-hourglass-split text-warning fs-5"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-muted small mb-1">Received This Month</div>
                  <div className="fs-3 fw-bold text-muted">—</div>
                  <div className="small text-muted">No payments yet</div>
                </div>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 44, height: 44, backgroundColor: '#d1f2eb' }}
                >
                  <i className="bi bi-cash-coin text-success fs-5"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── Middle row: Remittances + Recent Submissions ────────────────────── */}
      <Row className="g-3 mb-4">
        <Col lg={7}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 py-3">
              <h6 className="mb-0 fw-semibold">
                <i className="bi bi-cash-stack text-success me-2"></i>
                Remittances to Acknowledge
              </h6>
              <small className="text-muted">
                Confirm receipt to close the loop with insurer
              </small>
            </Card.Header>
            <Card.Body>
              <div className="text-center py-5">
                <i
                  className="bi bi-inbox"
                  style={{ fontSize: 48, color: '#dfe4ea' }}
                ></i>
                <div className="fw-semibold text-muted mt-3">
                  No pending remittances
                </div>
                <div className="small text-muted mt-1">
                  When the insurer sends a payment, it will appear here for you to acknowledge.
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 py-3">
              <h6 className="mb-0 fw-semibold">
                <i className="bi bi-list-ul text-primary me-2"></i>
                Recent Submissions
              </h6>
              <small className="text-muted">Your latest claims</small>
            </Card.Header>
            <Card.Body>
              <div className="text-center py-5">
                <i
                  className="bi bi-file-earmark-plus"
                  style={{ fontSize: 48, color: '#dfe4ea' }}
                ></i>
                <div className="fw-semibold text-muted mt-3">
                  No claims submitted yet
                </div>
                <div className="small text-muted mt-1 mb-3">
                  Click "New Claim" to file your first claim.
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate('/claims/submit')}
                >
                  <i className="bi bi-plus-lg me-1"></i> Submit a Claim
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── Quick Access cards (pulled from permissions.js) ─────────────────── */}
      {/* Same source the sidebar uses. Add a menu item there → it appears here. */}
      <h5 className="fw-semibold mb-3">Quick Access</h5>
      <Row className="g-3">
        {myMenu.map((item) => (
          <Col md={4} lg={3} key={item.key}>
            <Card
              className="border-0 shadow-sm h-100"
              role="button"
              onClick={() => navigate(item.path)}
              style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <Card.Body className="text-center">
                <div
                  className="rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center"
                  style={{ width: 50, height: 50, backgroundColor: '#e3f2fd' }}
                >
                  <i className={`${item.icon} text-primary fs-4`}></i>
                </div>
                <div className="fw-semibold">{item.label}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}
