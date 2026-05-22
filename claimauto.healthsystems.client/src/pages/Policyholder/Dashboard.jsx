import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Spinner, Alert, Button } from 'react-bootstrap';
import { useAuth } from '../../security/AuthContext';
import { fetchDashboardData } from '../../services/policyholder/dashboardService';
//import { findActiveAppeal } from '../../data/policyholderDashboardData';
import { findActiveAppeal } from '../../data/policyholderDashboardData';

// Components
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Loading skeleton
  if (loading) {
    return (
      <Container fluid className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <div className="mt-3 text-muted">Loading your dashboard...</div>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger" className="d-flex align-items-center justify-content-between">
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

  const { policy, claims, notifications, appeals, member, payments } = data;
  const activeAppeal = findActiveAppeal(appeals);
  const unreadCount  = notifications.filter((n) => n.status === 'Unread').length;
  const pendingClaims = claims.filter((c) => ['Pending', 'UnderReview', 'Submitted'].includes(c.status)).length;

  return (
    <Container fluid style={{ maxWidth: 1400 }}>

      {/* 🔔 NOTIFICATIONS BANNER — TOP PRIORITY */}
      <NotificationsBanner notifications={notifications} onUpdate={loadData} />

      {/* WELCOME HEADER */}
      <WelcomeHeader user={user} pendingClaims={pendingClaims} unreadCount={unreadCount} />

      {/* RENEWAL ALERT (conditional) */}
      <RenewalAlert policy={policy} />

      {/* POLICY HERO */}
      <PolicyOverviewCard policy={policy} memberCount={member ? 1 : 0} />

      {/* COVERAGE UTILIZATION */}
      <CoverageUtilization policy={policy} claims={claims} />

      {/* CLAIM STATS — clickable filters */}
      <ClaimStatsRow claims={claims} />

      {/* MAIN GRID — 2 columns */}
      <Row className="g-3 mb-3">
        <Col lg={8}>
          <div className="d-flex flex-column gap-3">
            <RecentClaimsTable claims={claims} />
            <MyMemberCard member={member} />
          </div>
        </Col>

        <Col lg={4}>
          <div className="d-flex flex-column gap-3">
            <QuickActionsPanel claims={claims} activeAppeal={activeAppeal} />
            {activeAppeal && <ActiveAppealCard appeal={activeAppeal} onUpdate={loadData} />}
            <RecentPaymentsCard payments={payments} />
          </div>
        </Col>
      </Row>

      {/* FOOTER NOTE */}
      <div className="text-center text-muted small py-3 mt-2">
        Need help? Email <a href="mailto:support@claimauto.com">support@claimauto.com</a> or call 1800-CLAIM
      </div>

    </Container>
  );
}