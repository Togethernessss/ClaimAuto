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
  const policyList = Array.isArray(data.policies) && data.policies.length > 0
    ? data.policies
    : (policy ? [policy] : []);
  const memberList = Array.isArray(data.members) && data.members.length > 0
    ? data.members
    : (member ? [member] : []);
  const coveragePolicy = policyList.length > 1
    ? buildCombinedCoveragePolicy(policyList)
    : policy;
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
            {policyList.length > 1 ? (
              <ActivePoliciesPanel policies={policyList} members={memberList} />
            ) : (
              <PolicyOverviewCard policy={policy} memberCount={member ? 1 : 0} />
            )}
          </Col>
          <Col lg={5}>
            {/* activePolicies prop scopes "Used" to claims under currently-active
                policies, preventing a removed/expired policy's old claims from
                inflating the utilization bar past 100%. */}
            <CoverageUtilization
              policy={coveragePolicy}
              claims={claims}
              activePolicies={policyList}
            />
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

function buildCombinedCoveragePolicy(policies) {
  if (!policies.length) return null;

  return {
    ...policies[0],
    planName: `${policies.length} Active Policies`,
    planCode: 'Combined Coverage',
    coverageAmount: policies.reduce((sum, p) => sum + Number(p.coverageAmount ?? 0), 0),
    deductibleAmount: policies.reduce((sum, p) => sum + Number(p.deductibleAmount ?? 0), 0),
    status: policies.every((p) => p.status === 'Active') ? 'Active' : 'Mixed',
  };
}

function ActivePoliciesPanel({ policies, members }) {
  if (!policies.length) return null;

  // ── Scroll threshold ────────────────────────────────────────────────
  // Up to 3 policies fit the card naturally. From the 4th onward we cap
  // the list height and let it scroll inside the card. This keeps the
  // outer dashboard layout (Coverage card, stats row, etc.) aligned and
  // prevents a tall policy list from pushing everything below the fold.
  const SCROLL_THRESHOLD = 3;
  const isScrollable = policies.length > SCROLL_THRESHOLD;
  const MAX_LIST_HEIGHT = 280;   // ~3 rows visible, 4th peeks → scroll hint

  return (
    <div
      className="mb-3"
      style={{
        background: 'white',
        borderRadius: 18,
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      <div
        className="d-flex align-items-center justify-content-between px-4 py-3"
        style={{ borderBottom: '1px solid #f1f5f9' }}
      >
        <div className="d-flex align-items-center gap-2">
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="bi bi-shield-check text-white" style={{ fontSize: '0.95rem' }}></i>
          </div>
          <div>
            <div className="fw-bold" style={{ color: '#1e293b', fontSize: '0.98rem' }}>
              Your Active Policies
            </div>
            <div style={{ color: '#64748b', fontSize: '0.76rem' }}>
              {policies.length} linked policies under the same Member ID
            </div>
          </div>
        </div>
        <span
          className="rounded-pill fw-bold"
          style={{
            background: '#ecfdf5',
            color: '#047857',
            border: '1px solid #a7f3d0',
            padding: '5px 12px',
            fontSize: '0.72rem',
          }}
        >
          {policies.length} active
        </span>
      </div>

      {/* ── Policy list — capped height + inner scroll when 4+ policies ─ */}
      <div style={{ position: 'relative' }}>
        <div
          className={`px-4 py-3 d-flex flex-column gap-2${isScrollable ? ' scrollable-list' : ''}`}
          style={{
            maxHeight: isScrollable ? MAX_LIST_HEIGHT : 'none',
            overflowY: isScrollable ? 'auto' : 'visible',
          }}
        >
          {policies.map((policy) => {
            const enrollment = members.find((m) => m.policyID === policy.policyID);
            return (
              <div
                key={policy.policyID}
                className="d-flex align-items-center justify-content-between gap-3 py-2"
                style={{ borderBottom: '1px solid #f8fafc' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="fw-semibold" style={{ color: '#1e293b', fontSize: '0.92rem' }}>
                    {policy.planName}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    {policy.planCode || 'Policy'} | Member ID {enrollment?.memberNumber || '-'}
                  </div>
                </div>
                <div className="text-end" style={{ flexShrink: 0 }}>
                  <div className="fw-bold" style={{ color: '#4f46e5', fontSize: '0.9rem' }}>
                    {formatPolicyAmount(policy.coverageAmount)}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                    {formatPolicyDate(enrollment?.coverageStart ?? policy.effectiveFrom)}
                    {' - '}
                    {formatPolicyDate(enrollment?.coverageEnd ?? policy.effectiveTo)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom fade — visual cue that more content exists below */}
        {isScrollable && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 24,
              pointerEvents: 'none',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 90%)',
            }}
          ></div>
        )}
      </div>

      {/* Subtle scroll hint — only when there are more policies than fit */}
      {isScrollable && (
        <div
          className="d-flex align-items-center justify-content-center px-4 pb-3"
          style={{
            fontSize: '0.7rem',
            color: '#94a3b8',
            borderTop: '1px solid #f1f5f9',
            paddingTop: 8,
            gap: 4,
          }}
        >
          <i className="bi bi-arrow-down-circle"></i>
          Scroll inside the list to see all {policies.length} policies
        </div>
      )}
    </div>
  );
}

function formatPolicyAmount(amount) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));
}

function formatPolicyDate(value) {
  if (!value) return 'Open-ended';
  return new Date(value).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
