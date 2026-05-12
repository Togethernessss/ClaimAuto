import { Container, Row, Col, Card, Button, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import { getMenuForRole } from '../../security/permissions';
import { useState, useEffect } from 'react';
import { getActivePolicies }   from '../../services/policies/policyService';

export default function HospitalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  
  const myMenu = getMenuForRole(user.role).filter((m) => m.key !== 'dashboard');

  // ── POLICIES STATE ────────────────────────────────────────────────────────
  // 3 state variables — same pattern as Policies.jsx
  const [policies,        setPolicies]        = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policiesError,   setPoliciesError]   = useState(null);

  // ── FETCH ACTIVE POLICIES ON LOAD ─────────────────────────────────────────
  // useEffect runs once when the dashboard first opens
  // [] at the end means "run once only"
  useEffect(() => {
    async function load() {
      try {
        const data = await getActivePolicies();
        setPolicies(data);
      } catch (err) {
        setPoliciesError('Could not load policies.');
      } finally {
        setPoliciesLoading(false);
      }
    }
    load();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
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

      {/* ── Middle row: Policies + Remittances + Recent Submissions ─────────── */}
      <Row className="g-3 mb-4">

        {/* ── ACTIVE POLICIES CARD ──────────────────────────────────────────── */}
        <Col lg={4}>
          <Card className="border-0 shadow-sm h-100">

            {/* Card header */}
            <Card.Header className="bg-white border-0 py-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <h6 className="mb-0 fw-semibold">
                    <i className="bi bi-shield-check text-primary me-2"></i>
                    Active Policies
                  </h6>
                  <small className="text-muted">
                    Plans available for claim submission
                  </small>
                </div>
                {/* Badge showing total count */}
                {!policiesLoading && !policiesError && (
                  <Badge bg="primary" className="rounded-pill">
                    {policies.length}
                  </Badge>
                )}
              </div>
            </Card.Header>

            <Card.Body className="p-0">

              {/* ── LOADING STATE ────────────────────────────────────────────── */}
              {policiesLoading && (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" variant="primary" />
                  <div className="text-muted small mt-2">Loading policies...</div>
                </div>
              )}

              {/* ── ERROR STATE ──────────────────────────────────────────────── */}
              {!policiesLoading && policiesError && (
                <div className="text-center py-4 px-3">
                  <i
                    className="bi bi-exclamation-circle text-danger"
                    style={{ fontSize: 32 }}
                  ></i>
                  <div className="text-muted small mt-2">{policiesError}</div>
                </div>
              )}

              {/* ── EMPTY STATE ──────────────────────────────────────────────── */}
              {!policiesLoading && !policiesError && policies.length === 0 && (
                <div className="text-center py-4 px-3">
                  <i
                    className="bi bi-inbox"
                    style={{ fontSize: 36, color: '#dfe4ea' }}
                  ></i>
                  <div className="fw-semibold text-muted mt-2 small">
                    No active policies found
                  </div>
                  <div className="text-muted small mt-1">
                    Contact your insurer to set up a plan.
                  </div>
                </div>
              )}

              {/* ── POLICY LIST ──────────────────────────────────────────────── */}
              {/* .slice(0, 3) shows only the first 3 policies */}
              {/* Full list is available at /policies page */}
              {!policiesLoading && !policiesError && policies.length > 0 && (
                <ul className="list-unstyled mb-0">
                  {policies.slice(0, 3).map((policy, index) => (
                    <li
                      key={policy.policyID}
                      className="px-3 py-2"
                      style={{
                        borderBottom:
                          index < Math.min(policies.length, 3) - 1
                            ? '1px solid #f0f0f0'
                            : 'none',
                      }}
                    >
                      <div className="d-flex align-items-start gap-2">

                        {/* Green dot indicator */}
                        <div
                          className="rounded-circle flex-shrink-0 mt-1"
                          style={{
                            width: 8,
                            height: 8,
                            backgroundColor: '#2e7d32',
                            marginTop: 6,
                          }}
                        ></div>

                        <div className="flex-grow-1 min-width-0">
                          {/* Plan name */}
                          <div
                            className="fw-semibold small text-truncate"
                            style={{ color: '#1e2a3a' }}
                          >
                            {policy.planName}
                          </div>

                          {/* Plan code + deductible */}
                          <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
                            <span
                              className="font-monospace"
                              style={{ fontSize: '0.7rem', color: '#9e9e9e' }}
                            >
                              {policy.planCode}
                            </span>
                            {policy.deductibleAmount != null && (
                              <span
                                className="badge"
                                style={{
                                  fontSize: '0.65rem',
                                  background: '#e8f5e9',
                                  color: '#2e7d32',
                                  fontWeight: 600,
                                  borderRadius: 4,
                                  padding: '2px 6px',
                                }}
                              >
                                ₹
                                {Number(
                                  policy.deductibleAmount
                                ).toLocaleString('en-IN')}{' '}
                                deductible
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    </li>
                  ))}
                </ul>
              )}

            </Card.Body>

            {/* ── Card Footer — View All link ─────────────────────────────────── */}
            {!policiesLoading && !policiesError && policies.length > 0 && (
              <Card.Footer
                className="bg-white border-0 pt-0 pb-3 px-3"
              >
                <button
                  className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                  style={{ color: '#1a56db', fontSize: '0.82rem' }}
                  onClick={() => navigate('/policies')}
                >
                  View all {policies.length} active{' '}
                  {policies.length === 1 ? 'policy' : 'policies'}
                  <i className="bi bi-arrow-right ms-1"></i>
                </button>
              </Card.Footer>
            )}

          </Card>
        </Col>

        {/* ── REMITTANCES CARD (unchanged) ──────────────────────────────────── */}
        <Col lg={4}>
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
                  When the insurer sends a payment, it will appear here.
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* ── RECENT SUBMISSIONS CARD (unchanged) ───────────────────────────── */}
        <Col lg={4}>
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
