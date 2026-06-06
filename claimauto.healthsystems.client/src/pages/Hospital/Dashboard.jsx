import { Container, Row, Col, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import { getMenuForRole } from '../../security/permissions';
import { useState, useEffect } from 'react';
import { getActivePolicies } from '../../services/policies/policyService';
import { getAllRemittances } from '../../services/payments/remittanceService';
import { getAllClaims } from '../../services/claims/claimService';
import WelcomeBanner from '../../components/WelcomeBanner';
import StatCard from '../../components/dashboard/StatCard';
import PriorityActionBar from '../../components/dashboard/PriorityActionBar';
import DashboardPanel from '../../components/dashboard/DashboardPanel';
import EmptyStatePanel from '../../components/dashboard/EmptyStatePanel';
import QuickAccessGrid from '../../components/dashboard/QuickAccessGrid';

export default function HospitalDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  // ── fix: filter by correct key ────────────────────────────
  const myMenu = getMenuForRole(user.role)
    .filter((m) => m.key !== 'dashboard-hospital');

  const [policies,        setPolicies]        = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policiesError,   setPoliciesError]   = useState(null);

  const [remittances,        setRemittances]        = useState([]);
  const [remittancesLoading, setRemittancesLoading] = useState(true);
  const [remittancesError,   setRemittancesError]   = useState(null);

  const [claimsThisMonth, setClaimsThisMonth] = useState(null);
  const [approvedClaims,  setApprovedClaims]  = useState(null);
  const [pendingClaims,   setPendingClaims]   = useState(null);
  const [deniedClaims,    setDeniedClaims]    = useState(null);
  const [recentClaims,    setRecentClaims]    = useState([]);   // ← NEW
  const [statsLoading,    setStatsLoading]    = useState(true);
  const [statsError,      setStatsError]      = useState(false);

  useEffect(() => {
    async function loadPolicies() {
      try {
        const data = await getActivePolicies();
        setPolicies(data);
      } catch {
        setPoliciesError('Could not load policies.');
      } finally {
        setPoliciesLoading(false);
      }
    }

    async function loadRemittances() {
      try {
        const data = await getAllRemittances();
        setRemittances(data);
      } catch {
        setRemittancesError('Could not load remittances.');
      } finally {
        setRemittancesLoading(false);
      }
    }

    async function loadStats() {
      try {
        const claims = await getAllClaims();
        const now    = new Date();
        const month  = now.getMonth();
        const year   = now.getFullYear();

        const thisMonth = claims.filter(c => {
          const _sa = c.submittedAt && !c.submittedAt.endsWith('Z') ? c.submittedAt + 'Z' : c.submittedAt; const d = new Date(_sa);
          return d.getMonth() === month &&
                 d.getFullYear() === year;
        });
        setClaimsThisMonth(thisMonth.length);
        setApprovedClaims(
          claims.filter(c =>
            c.status === 'Approved' || c.status === 'Paid'
          ).length
        );
        setPendingClaims(
          claims.filter(c =>
            c.status === 'Submitted' ||
            c.status === 'UnderReview'
          ).length
        );
        setDeniedClaims(
          claims.filter(c => c.status === 'Rejected').length
        );
        // Most recent 3 claims for the Recent Submissions panel
        const sorted = [...claims].sort((a, b) => {
          const tA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const tB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return tB - tA;
        });
        setRecentClaims(sorted.slice(0, 3));
      } catch {
        setStatsError(true);
      } finally {
        setStatsLoading(false);
      }
    }

    loadPolicies();
    loadRemittances();
    loadStats();
  }, []);

  const pendingRemittances = remittances.filter(
    r => r.status === 'Sent'
  );
  const unacknowledged = remittances
    .filter(r => r.status !== 'Acknowledged')
    .slice(0, 10);

  // Styling for claim status pills in Recent Submissions
  function claimStatusStyle(status) {
    switch (status) {
      case 'Submitted':               return { bg: '#dbeafe', color: '#1d4ed8', label: 'Submitted' };
      case 'DocsVerificationPending': return { bg: '#e0f2fe', color: '#0369a1', label: 'Docs Pending' };
      case 'UnderReview':             return { bg: '#fef9c3', color: '#854d0e', label: 'Under Review' };
      case 'Approved':                return { bg: '#d1fae5', color: '#065f46', label: 'Approved' };
      case 'Paid':                    return { bg: '#d1fae5', color: '#064e3b', label: 'Paid' };
      case 'Rejected':                return { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' };
      default:                        return { bg: '#f3f4f6', color: '#374151', label: status || '—' };
    }
  }

  function statusStyle(status) {
    switch (status) {
      case 'Generated':
        return { bg: '#e3f2fd', color: '#0C447C' };
      case 'Sent':
        return { bg: '#fef3c7', color: '#633806' };
      case 'Acknowledged':
        return { bg: '#d1f2eb', color: '#085041' };
      default:
        return { bg: '#e2e3e5', color: '#41464b' };
    }
  }

  function formatCurrency(val) {
    if (!val) return '—';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const utcIso = String(iso).endsWith('Z') || /[+\-]\d{2}:?\d{2}$/.test(String(iso)) ? iso : iso + 'Z'; return new Date(utcIso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  return (
    <Container fluid className="p-0">

      {statsError && (
        <div className="alert alert-warning py-2 mb-3 small">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Could not load claim statistics. Please refresh.
        </div>
      )}

      <WelcomeBanner emoji="🏥" />

      <div className="px-4 pb-4">

        {!remittancesLoading && pendingRemittances.length > 0 && (
          <PriorityActionBar
            accentColor="warning"
            icon="bi-cash-stack"
            title={`${pendingRemittances.length} remittance${pendingRemittances.length > 1 ? 's' : ''} awaiting your acknowledgement`}
            description="Please confirm receipt to close the payment loop with the insurer."
            buttonLabel="View Remittance History"
            buttonIcon="bi-list-stars"
            onButtonClick={() => navigate('/hospital/remittance')}
          />
        )}

        <Row className="g-3 mb-4">
          <Col md={6} lg={3}>
            <StatCard
              label="Claims This Month"
              value={statsLoading ? '…' : claimsThisMonth ?? '—'}
              icon="bi-file-earmark-text"
              borderColor="primary"
              footerIcon="bi-clock"
              footerText={statsLoading ? 'Loading…' :
                claimsThisMonth === 0
                  ? 'No claims this month'
                  : `${claimsThisMonth} submitted this month`}
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="Approved / Paid"
              value={statsLoading ? '…' : approvedClaims ?? '—'}
              icon="bi-check2-circle"
              borderColor="success"
              footerIcon="bi-check"
              footerText={statsLoading ? 'Loading…' :
                approvedClaims === 0
                  ? 'No approved claims'
                  : `${approvedClaims} approved or paid`}
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="Pending"
              value={statsLoading ? '…' : pendingClaims ?? '—'}
              icon="bi-hourglass-split"
              borderColor="warning"
              footerIcon="bi-hourglass"
              footerText={statsLoading ? 'Loading…' :
                pendingClaims === 0
                  ? 'No pending claims'
                  : `${pendingClaims} under review`}
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="Denied"
              value={statsLoading ? '…' : deniedClaims ?? '—'}
              icon="bi-x-circle"
              borderColor="danger"
              footerIcon="bi-shield"
              footerText={statsLoading ? 'Loading…' :
                deniedClaims === 0
                  ? 'No denied claims'
                  : `${deniedClaims} rejected`}
            />
          </Col>
        </Row>

        <Row className="g-3 mb-4">

          <Col lg={4}>
            <DashboardPanel
              icon="bi-shield-check"
              iconColor="primary"
              title="Active Policies"
              subtitle="Available for new claim submissions"
            >
              {policiesLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm"
                    variant="primary" />
                  <div className="text-muted small mt-2">
                    Loading policies...
                  </div>
                </div>
              ) : policiesError ? (
                <div className="text-center py-4">
                  <i className="bi bi-exclamation-circle
                    text-danger"
                    style={{ fontSize: 32 }}></i>
                  <div className="text-muted small mt-2">
                    {policiesError}
                  </div>
                </div>
              ) : policies.length === 0 ? (
                <EmptyStatePanel
                  icon="bi-shield-slash"
                  title="No active policies"
                  description="Contact your insurer to set up a plan."
                />
              ) : (
                <div style={{
                  maxHeight: 280, overflowY: 'auto',
                }}>
                  {policies.map((p, index) => (
                    <div
                      key={p.policyID}
                      onClick={() =>
                        navigate('/hospital/policies')}
                      style={{
                        padding: '12px 16px',
                        borderBottom:
                          index < policies.length - 1
                            ? '1px solid #f0f0f0' : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) =>
                        e.currentTarget.style.background =
                          '#f8f9fa'}
                      onMouseLeave={(e) =>
                        e.currentTarget.style.background =
                          'white'}
                    >
                      <div className="d-flex
                        align-items-start gap-3">
                        <div style={{
                          width: 8, height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#2e7d32',
                          flexShrink: 0, marginTop: 5,
                        }}></div>
                        <div className="flex-grow-1">
                          <div className="fw-semibold"
                            style={{ fontSize: 13,
                              color: '#1e2a3a' }}>
                            {p.planName}
                          </div>
                          <div className="d-flex
                            align-items-center gap-2
                            mt-1 flex-wrap">
                            <span className="font-monospace"
                              style={{ fontSize: 11,
                                color: '#9e9e9e' }}>
                              {p.planCode}
                            </span>
                            {p.deductibleAmount != null && (
                              <span style={{
                                fontSize: 11,
                                background: '#e8f5e9',
                                color: '#2e7d32',
                                fontWeight: 600,
                                borderRadius: 4,
                                padding: '1px 6px',
                              }}>
                                ₹{Number(p.deductibleAmount)
                                  .toLocaleString('en-IN')}{' '}
                                deductible
                              </span>
                            )}
                          </div>
                        </div>
                        <i className="bi bi-chevron-right
                          text-muted"
                          style={{ fontSize: 12,
                            marginTop: 3 }}></i>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!policiesLoading && !policiesError &&
                policies.length > 0 && (
                <div style={{
                  padding: '8px 16px',
                  borderTop: '1px solid #f0f0f0',
                }}>
                  <button
                    className="btn btn-link btn-sm p-0
                      text-decoration-none fw-semibold"
                    style={{
                      color: '#1a56db', fontSize: 12,
                    }}
                    onClick={() =>
                      navigate('/hospital/policies')}
                  >
                    View all {policies.length} active{' '}
                    {policies.length === 1
                      ? 'policy' : 'policies'}
                    <i className="bi bi-arrow-right ms-1">
                    </i>
                  </button>
                </div>
              )}
            </DashboardPanel>
          </Col>

          <Col lg={4}>
            <DashboardPanel
              icon="bi-cash-stack"
              iconColor="success"
              title="Remittances"
              subtitle="Recent unacknowledged remittances"
            >
              {remittancesLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm"
                    variant="success" />
                  <div className="text-muted small mt-2">
                    Loading remittances...
                  </div>
                </div>
              ) : remittancesError ? (
                <div className="text-center py-4">
                  <i className="bi bi-exclamation-circle
                    text-danger"
                    style={{ fontSize: 32 }}></i>
                  <div className="text-muted small mt-2">
                    {remittancesError}
                  </div>
                </div>
              ) : unacknowledged.length === 0 ? (
                <EmptyStatePanel
                  icon="bi-inbox"
                  title="No pending remittances"
                  description="When the insurer sends a payment, it will appear here."
                />
              ) : (
                <div style={{
                  maxHeight: 280, overflowY: 'auto',
                }}>
                  {unacknowledged.map((r, index) => {
                    const s = statusStyle(r.status);
                    return (
                      <div
                        key={r.remittanceID}
                        onClick={() =>
                          navigate('/hospital/remittance')}
                        style={{
                          padding: '12px 16px',
                          borderBottom:
                            index < unacknowledged.length - 1
                              ? '1px solid #f0f0f0' : 'none',
                          cursor: 'pointer',
                          background: r.status === 'Sent'
                            ? '#fffbf0' : 'white',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) =>
                          e.currentTarget.style.background =
                            '#f8f9fa'}
                        onMouseLeave={(e) =>
                          e.currentTarget.style.background =
                            r.status === 'Sent'
                              ? '#fffbf0' : 'white'}
                      >
                        <div className="d-flex
                          justify-content-between
                          align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex
                              align-items-center gap-2
                              mb-1 flex-wrap">
                              <span className="font-monospace
                                fw-semibold"
                                style={{ fontSize: 12 }}>
                                #REM-{r.remittanceID}
                              </span>
                              <span style={{
                                fontSize: 10,
                                padding: '1px 7px',
                                borderRadius: 20,
                                fontWeight: 600,
                                background: s.bg,
                                color: s.color,
                              }}>
                                {r.status}
                              </span>
                              {r.status === 'Sent' && (
                                <span style={{
                                  fontSize: 10,
                                  color: '#633806',
                                  background: '#fef3c7',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  fontWeight: 500,
                                }}>
                                  Action needed
                                </span>
                              )}
                            </div>
                            <div className="d-flex
                              align-items-center gap-2">
                              <span className="fw-semibold"
                                style={{ fontSize: 13,
                                  color: '#764ba2' }}>
                                {formatCurrency(r.amount)}
                              </span>
                              <span className="text-muted"
                                style={{ fontSize: 11 }}>
                                · Claim #{r.claimID}
                              </span>
                            </div>
                            <div className="text-muted"
                              style={{ fontSize: 11,
                                marginTop: 2 }}>
                              {formatDate(r.generatedAt)}
                            </div>
                          </div>
                          <i className="bi bi-chevron-right
                            text-muted"
                            style={{ fontSize: 12,
                              marginTop: 3 }}></i>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!remittancesLoading && !remittancesError &&
                remittances.length > 0 && (
                <div style={{
                  padding: '8px 16px',
                  borderTop: '1px solid #f0f0f0',
                }}>
                  <button
                    className="btn btn-link btn-sm p-0
                      text-decoration-none fw-semibold"
                    style={{
                      color: '#1a56db', fontSize: 12,
                    }}
                    onClick={() =>
                      navigate('/hospital/remittance')}
                  >
                    View all remittances
                    <i className="bi bi-arrow-right ms-1">
                    </i>
                  </button>
                </div>
              )}
            </DashboardPanel>
          </Col>

          <Col lg={4}>
            <DashboardPanel
              icon="bi-list-ul"
              iconColor="primary"
              title="Recent Submissions"
              subtitle="Your latest claims"
            >
              {statsLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" variant="primary" />
                  <div className="text-muted small mt-2">Loading claims…</div>
                </div>
              ) : recentClaims.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-file-earmark-plus"
                    style={{ fontSize: 48, color: '#dfe4ea' }}></i>
                  <div className="fw-semibold text-muted mt-3">
                    No claims submitted yet
                  </div>
                  <div className="small text-muted mt-1 mb-3">
                    Click "Submit a Claim" to file your first claim.
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate('/hospital/claims')}
                  >
                    <i className="bi bi-plus-lg me-1"></i>
                    Submit a Claim
                  </Button>
                </div>
              ) : (
                <>
                  <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                    {recentClaims.map((c, idx) => {
                      const ss = claimStatusStyle(c.status);
                      return (
                        <div
                          key={c.claimID}
                          onClick={() => navigate('/hospital/claims')}
                          style={{
                            padding: '11px 16px',
                            borderBottom:
                              idx < recentClaims.length - 1
                                ? '1px solid #f0f0f0' : 'none',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) =>
                            e.currentTarget.style.background = '#f8f9fa'}
                          onMouseLeave={(e) =>
                            e.currentTarget.style.background = 'white'}
                        >
                          <div className="d-flex align-items-start justify-content-between gap-2">
                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                <span className="font-monospace fw-bold"
                                  style={{ fontSize: 12, color: '#4c1d95' }}>
                                  CLM-{c.claimID}
                                </span>
                                <span style={{
                                  fontSize: 10, fontWeight: 700,
                                  padding: '1px 7px', borderRadius: 20,
                                  background: ss.bg, color: ss.color,
                                  whiteSpace: 'nowrap',
                                }}>
                                  {ss.label}
                                </span>
                              </div>
                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <span className="fw-semibold"
                                  style={{ fontSize: 12, color: '#764ba2' }}>
                                  ₹{Number(c.totalBilledAmount ?? 0)
                                      .toLocaleString('en-IN')}
                                </span>
                                {c.claimType && (
                                  <span className="text-muted"
                                    style={{ fontSize: 11 }}>
                                    · {c.claimType}
                                  </span>
                                )}
                              </div>
                              <div className="text-muted"
                                style={{ fontSize: 11, marginTop: 2 }}>
                                {formatDate(c.submittedAt)}
                              </div>
                            </div>
                            <i className="bi bi-chevron-right text-muted"
                              style={{ fontSize: 12, marginTop: 3, flexShrink: 0 }}></i>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0' }}>
                    <button
                      className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                      style={{ color: '#1a56db', fontSize: 12 }}
                      onClick={() => navigate('/hospital/claims')}
                    >
                      View all claims
                      <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                  </div>
                </>
              )}
            </DashboardPanel>
          </Col>

        </Row>

        <h5 className="fw-semibold mb-3">Quick Access</h5>
        <QuickAccessGrid
          items={myMenu}
          onItemClick={(item) => navigate(item.path)}
        />

      </div>
    </Container>
  );
}