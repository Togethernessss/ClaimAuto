import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Spinner, Alert, Button } from 'react-bootstrap';
import { useAuth } from '../../security/AuthContext';
import { fetchDashboardData } from '../../services/policyholder/dashboardService';
import { findActiveAppeal } from '../../data/policyholderDashboardData';

// Components — ALL unchanged; only layout/wrapper is redesigned
import NotificationsBanner from '../../components/policyholder/NotificationsBanner';
import WelcomeHeader       from '../../components/policyholder/WelcomeHeader';
import RenewalAlert        from '../../components/policyholder/RenewalAlert';
import PolicyOverviewCard  from '../../components/policyholder/PolicyOverviewCard';
import CoverageUtilization from '../../components/policyholder/CoverageUtilization';
import ClaimStatsRow       from '../../components/policyholder/ClaimsStatsRow';
import RecentClaimsTable   from '../../components/policyholder/RecentClaimsTable';
import ActiveAppealCard    from '../../components/policyholder/ActiveAppealCard';
import MyMemberCard        from '../../components/policyholder/MyMemberCard';
import RecentPaymentsCard  from '../../components/policyholder/RecentPaymentsCard';
import QuickActionsPanel   from '../../components/policyholder/QuickActionsPanel';

export default function PolicyholderDashboard() {
  const { user } = useAuth();

  // ── Data loading — completely unchanged ───────────────────────────
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardData();
      setData(result);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to load dashboard.';
      setError(typeof msg === 'string' ? msg : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}
      >
        <div
          style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(102,126,234,0.35)',
          }}
        >
          <Spinner animation="border" variant="light" style={{ width: 28, height: 28, borderWidth: 3 }} />
        </div>
        <div style={{ color: '#64748b', fontWeight: 500 }}>Loading your dashboard...</div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (error) {
    return (
      <Container fluid className="py-4" style={{ maxWidth: 1400 }}>
        <Alert variant="danger" className="d-flex align-items-center justify-content-between rounded-3">
          <div>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </div>
          <Button size="sm" variant="outline-danger" onClick={loadData}>
            <i className="bi bi-arrow-clockwise me-1"></i> Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  // ── Derivations — unchanged ───────────────────────────────────────
  const { policy, claims, notifications, appeals, member, payments } = data;
  const activeAppeal  = findActiveAppeal(appeals);
  const unreadCount   = notifications.filter((n) => n.status === 'Unread').length;
  const pendingClaims = claims.filter((c) => ['Pending', 'UnderReview', 'Submitted'].includes(c.status)).length;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f0f4f8 0%, #f8fafc 100%)',
        padding: '0 0 40px',
      }}
    >
      <Container fluid style={{ maxWidth: 1400, padding: '0 24px' }}>

        {/* ── Notifications banner (stays at very top) ─────────────── */}
        <div style={{ paddingTop: 20 }}>
          <NotificationsBanner notifications={notifications} onUpdate={loadData} />
        </div>

        {/* ── Welcome hero ─────────────────────────────────────────── */}
        <WelcomeHeader user={user} pendingClaims={pendingClaims} unreadCount={unreadCount} />

        {/* ── Renewal alert (conditional) ──────────────────────────── */}
        <RenewalAlert policy={policy} />

        {/* ── TOP SECTION: Policy hero (left) + Coverage (right) ───── */}
        <Row className="g-3 mb-1">
          <Col lg={7}>
            <PolicyOverviewCard policy={policy} memberCount={member ? 1 : 0} />
          </Col>
          <Col lg={5}>
            <CoverageUtilization policy={policy} claims={claims} />
          </Col>
        </Row>

        {/* ── STATS ROW (full width) ───────────────────────────────── */}
        <ClaimStatsRow claims={claims} />

        {/* ── MAIN GRID: Claims + sidebar ──────────────────────────── */}
        <Row className="g-3">

          {/* Left column — claims table + member card */}
          <Col lg={8}>
            <div className="d-flex flex-column gap-3">
              <RecentClaimsTable claims={claims} />
              <MyMemberCard member={member} />
            </div>
          </Col>

          {/* Right sidebar — actions + appeal + payments */}
          <Col lg={4}>
            <div className="d-flex flex-column gap-3">
              <QuickActionsPanel claims={claims} activeAppeal={activeAppeal} />
              {activeAppeal && (
                <ActiveAppealCard appeal={activeAppeal} onUpdate={loadData} />
              )}
              <RecentPaymentsCard payments={payments} />
            </div>
          </Col>

        </Row>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div
          className="text-center mt-4 pt-2"
          style={{ fontSize: '0.78rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: 16 }}
        >
          <i className="bi bi-headset me-1"></i>
          Need help? Email{' '}
          <a href="mailto:support@claimauto.com" style={{ color: '#6366f1' }}>
            support@claimauto.com
          </a>
          {' '}or call{' '}
          <a href="tel:1800CLAIM" style={{ color: '#6366f1' }}>
            1800-CLAIM
          </a>
        </div>

      </Container>
    </div>
  );
}
