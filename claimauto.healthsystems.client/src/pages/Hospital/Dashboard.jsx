import { Container, Row, Col, Card, Button, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import { getMenuForRole } from '../../security/permissions';
import { useState, useEffect } from 'react';
import { getActivePolicies } from '../../services/policies/policyService';
import WelcomeBanner from '../../components/WelcomeBanner';

export default function HospitalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const myMenu = getMenuForRole(user.role).filter((m) => m.key !== 'dashboard');

  const [policies, setPolicies] = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policiesError, setPoliciesError] = useState(null);

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

  return (
    <Container fluid className="p-0">

      {/* ── Welcome Banner — full width ──────────────────────────────────── */}
      <WelcomeBanner
        emoji="🏥"
        actions={[
          {
            label: 'Bulk Upload',
            icon: 'bi-upload',
            variant: 'outline-light',
            onClick: () => navigate('/claims/bulk-upload'),
          },
          {
            label: 'New Claim',
            icon: 'bi-plus-lg',
            variant: 'light',
            onClick: () => navigate('/claims/submit'),
          },
        ]}
      />

      {/* ── All content below banner gets padding ────────────────────────── */}
      <div className="px-4 pb-4">

        {/* ── Priority Action Bar ────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm mb-4 border-start border-warning border-4">
          <Card.Body className="d-flex align-items-center flex-wrap gap-3 py-3">
            <div className="rounded-circle bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center"
              style={{ width: 38, height: 38, flexShrink: 0 }}>
              <i className="bi bi-cash-stack fs-5"></i>
            </div>
            <div className="flex-grow-1" style={{ minWidth: 220 }}>
              <div className="fw-semibold">No pending remittances</div>
              <small className="text-muted">
                When the insurer sends a payment, it'll appear here for you to acknowledge.
              </small>
            </div>
            <button className="btn btn-sm text-white fw-semibold"
              onClick={() => navigate('/remittance')}
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
              <i className="bi bi-list-stars me-1"></i> View Remittance History
            </button>
          </Card.Body>
        </Card>

        {/* ── Stat Cards ─────────────────────────────────────────────────── */}
        <Row className="g-3 mb-4">
          <Col md={6} lg={3}>
            <Card className="border-0 shadow-sm h-100 border-top border-primary border-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-uppercase text-muted small fw-semibold mb-1">Claims This Month</div>
                    <div className="fs-3 fw-bold text-muted">—</div>
                    <div className="small text-muted"><i className="bi bi-clock me-1"></i> No data yet</div>
                  </div>
                  <div className="rounded d-flex align-items-center justify-content-center bg-primary bg-opacity-10"
                    style={{ width: 42, height: 42 }}>
                    <i className="bi bi-file-earmark-text text-primary fs-5"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6} lg={3}>
            <Card className="border-0 shadow-sm h-100 border-top border-success border-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-uppercase text-muted small fw-semibold mb-1">Approval Rate</div>
                    <div className="fs-3 fw-bold text-muted">—</div>
                    <div className="small text-muted"><i className="bi bi-graph-up me-1"></i> Awaiting data</div>
                  </div>
                  <div className="rounded d-flex align-items-center justify-content-center bg-success bg-opacity-10"
                    style={{ width: 42, height: 42 }}>
                    <i className="bi bi-check-circle text-success fs-5"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6} lg={3}>
            <Card className="border-0 shadow-sm h-100 border-top border-warning border-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-uppercase text-muted small fw-semibold mb-1">Pending Review</div>
                    <div className="fs-3 fw-bold text-muted">—</div>
                    <div className="small text-muted"><i className="bi bi-clock me-1"></i> No pending claims</div>
                  </div>
                  <div className="rounded d-flex align-items-center justify-content-center bg-warning bg-opacity-10"
                    style={{ width: 42, height: 42 }}>
                    <i className="bi bi-hourglass-split text-warning fs-5"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6} lg={3}>
            <Card className="border-0 shadow-sm h-100 border-top border-danger border-3">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="text-uppercase text-muted small fw-semibold mb-1">Received This Month</div>
                    <div className="fs-3 fw-bold text-muted">—</div>
                    <div className="small text-muted"><i className="bi bi-bank me-1"></i> No payments yet</div>
                  </div>
                  <div className="rounded d-flex align-items-center justify-content-center bg-danger bg-opacity-10"
                    style={{ width: 42, height: 42 }}>
                    <i className="bi bi-cash-coin text-danger fs-5"></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* ── Middle row ─────────────────────────────────────────────────── */}
        <Row className="g-3 mb-4">

          {/* Active Policies */}
          <Col lg={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white border-0 py-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h6 className="mb-0 fw-semibold">
                      <i className="bi bi-shield-check text-primary me-2"></i>Active Policies
                    </h6>
                    <small className="text-muted">Plans available for claim submission</small>
                  </div>
                  {!policiesLoading && !policiesError && (
                    <Badge bg="primary" className="rounded-pill">{policies.length}</Badge>
                  )}
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {policiesLoading && (
                  <div className="text-center py-4">
                    <Spinner animation="border" size="sm" variant="primary" />
                    <div className="text-muted small mt-2">Loading policies...</div>
                  </div>
                )}
                {!policiesLoading && policiesError && (
                  <div className="text-center py-4 px-3">
                    <i className="bi bi-exclamation-circle text-danger" style={{ fontSize: 32 }}></i>
                    <div className="text-muted small mt-2">{policiesError}</div>
                  </div>
                )}
                {!policiesLoading && !policiesError && policies.length === 0 && (
                  <div className="text-center py-4 px-3">
                    <i className="bi bi-inbox" style={{ fontSize: 36, color: '#dfe4ea' }}></i>
                    <div className="fw-semibold text-muted mt-2 small">No active policies found</div>
                    <div className="text-muted small mt-1">Contact your insurer to set up a plan.</div>
                  </div>
                )}
                {!policiesLoading && !policiesError && policies.length > 0 && (
                  <ul className="list-unstyled mb-0">
                    {policies.slice(0, 3).map((policy, index) => (
                      <li key={policy.policyID} className="px-3 py-2"
                        style={{ borderBottom: index < Math.min(policies.length, 3) - 1 ? '1px solid #f0f0f0' : 'none' }}>
                        <div className="d-flex align-items-start gap-2">
                          <div className="rounded-circle flex-shrink-0"
                            style={{ width: 8, height: 8, backgroundColor: '#2e7d32', marginTop: 6 }}></div>
                          <div className="flex-grow-1">
                            <div className="fw-semibold small text-truncate" style={{ color: '#1e2a3a' }}>
                              {policy.planName}
                            </div>
                            <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
                              <span className="font-monospace" style={{ fontSize: '0.7rem', color: '#9e9e9e' }}>
                                {policy.planCode}
                              </span>
                              {policy.deductibleAmount != null && (
                                <span className="badge" style={{
                                  fontSize: '0.65rem', background: '#e8f5e9', color: '#2e7d32',
                                  fontWeight: 600, borderRadius: 4, padding: '2px 6px',
                                }}>
                                  ₹{Number(policy.deductibleAmount).toLocaleString('en-IN')} deductible
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
              {!policiesLoading && !policiesError && policies.length > 0 && (
                <Card.Footer className="bg-white border-0 pt-0 pb-3 px-3">
                  <button className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                    style={{ color: '#1a56db', fontSize: '0.82rem' }}
                    onClick={() => navigate('/policies')}>
                    View all {policies.length} active {policies.length === 1 ? 'policy' : 'policies'}
                    <i className="bi bi-arrow-right ms-1"></i>
                  </button>
                </Card.Footer>
              )}
            </Card>
          </Col>

          {/* Remittances */}
          <Col lg={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white border-0 py-3">
                <h6 className="mb-0 fw-semibold">
                  <i className="bi bi-cash-stack text-success me-2"></i>Remittances to Acknowledge
                </h6>
                <small className="text-muted">Confirm receipt to close the loop with insurer</small>
              </Card.Header>
              <Card.Body>
                <div className="text-center py-5">
                  <i className="bi bi-inbox" style={{ fontSize: 48, color: '#dfe4ea' }}></i>
                  <div className="fw-semibold text-muted mt-3">No pending remittances</div>
                  <div className="small text-muted mt-1">When the insurer sends a payment, it will appear here.</div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Recent Submissions */}
          <Col lg={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-white border-0 py-3">
                <h6 className="mb-0 fw-semibold">
                  <i className="bi bi-list-ul text-primary me-2"></i>Recent Submissions
                </h6>
                <small className="text-muted">Your latest claims</small>
              </Card.Header>
              <Card.Body>
                <div className="text-center py-5">
                  <i className="bi bi-file-earmark-plus" style={{ fontSize: 48, color: '#dfe4ea' }}></i>
                  <div className="fw-semibold text-muted mt-3">No claims submitted yet</div>
                  <div className="small text-muted mt-1 mb-3">Click "New Claim" to file your first claim.</div>
                  <Button size="sm" variant="primary" onClick={() => navigate('/claims/submit')}>
                    <i className="bi bi-plus-lg me-1"></i> Submit a Claim
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>

        </Row>

        {/* ── Quick Access ───────────────────────────────────────────────── */}
        <h5 className="fw-semibold mb-3">Quick Access</h5>
        <Row className="g-3 pb-2">
          {myMenu.map((item) => (
            <Col md={4} lg={3} key={item.key}>
              <Card className="border-0 shadow-sm h-100" role="button"
                onClick={() => navigate(item.path)}
                style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>
                <Card.Body className="text-center">
                  <div className="rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center"
                    style={{ width: 50, height: 50, backgroundColor: '#e3f2fd' }}>
                    <i className={`${item.icon} text-primary fs-4`}></i>
                  </div>
                  <div className="fw-semibold">{item.label}</div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

      </div>
    </Container>
  );
}