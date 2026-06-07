import { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import { getMenuForRole } from '../../security/permissions';
import WelcomeBanner    from '../../components/WelcomeBanner';
import StatCard         from '../../components/dashboard/StatCard';
import CircularKPI      from '../../components/dashboard/CircularKPI';
import PriorityActionBar from '../../components/dashboard/PriorityActionBar';
import DashboardPanel   from '../../components/dashboard/DashboardPanel';
import EmptyStatePanel  from '../../components/dashboard/EmptyStatePanel';
import SectionHeader    from '../../components/dashboard/SectionHeader';
import QuickAccessGrid  from '../../components/dashboard/QuickAccessGrid';
import { getAllKPIs }        from '../../services/reports/reportService';
import { getAllClaims }      from '../../services/claims/claimService';
import { getAllTasks }       from '../../services/tasks/taskService';
import { getAllFraudCases }  from '../../services/fraud/fraudService';
import { getAllAppeals }     from '../../services/appeals/appealService';

// ── Inline formatters (keep Dashboard self-contained) ────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
function fmtCurrency(val) {
  if (val == null) return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

// ── Priority + status style maps ─────────────────────────────────────────────
const PRIORITY_STYLE = {
  Urgent: { bg: '#fef2f2', color: '#ef4444', border: '#fca5a5' },
  High:   { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  Normal: { bg: '#f0f9ff', color: '#0ea5e9', border: '#bae6fd' },
};
const PRIORITY_ORDER = { Urgent: 0, High: 1, Normal: 2 };

const STATUS_LABEL = {
  DocsVerificationPending: 'Docs Review',
  UnderReview:             'Under Review',
};
const STATUS_STYLE = {
  DocsVerificationPending: { bg: '#eff6ff', color: '#3b82f6' },
  UnderReview:             { bg: '#fef3c7', color: '#d97706' },
};

// ── Shared row hover handlers ─────────────────────────────────────────────────
const onRowEnter = (e) => { e.currentTarget.style.background = '#f9fafb'; };
const onRowLeave = (e) => { e.currentTarget.style.background = 'transparent'; };

// ─────────────────────────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const myMenu = getMenuForRole(user.role)
    .filter((m) => m.key !== 'dashboard-staff');

  // ── KPI state ──────────────────────────────────────────────────────────────
  const [kpis,        setKpis]        = useState([]);
  const [kpisLoading, setKpisLoading] = useState(true);

  // ── Stat-card counts ───────────────────────────────────────────────────────
  const [pendingClaims, setPendingClaims] = useState(null);
  const [myTasks,       setMyTasks]       = useState(null);
  const [fraudAlerts,   setFraudAlerts]   = useState(null);
  const [openAppeals,   setOpenAppeals]   = useState(null);
  const [statsLoading,  setStatsLoading]  = useState(true);

  // ── Panel data arrays (null = still loading) ───────────────────────────────
  const [claimsAwaitingReview, setClaimsAwaitingReview] = useState(null);
  const [tasksList,            setTasksList]            = useState(null);

  useEffect(() => {
    // ── KPIs (independent call — can render ahead of stats) ─────────────────
    getAllKPIs()
      .then(setKpis)
      .catch(() => setKpis([]))
      .finally(() => setKpisLoading(false));

    // ── All other dashboard data in parallel ─────────────────────────────────
    Promise.allSettled([
      getAllClaims(),              // fetch ALL claims — filter to review-needed below
      getAllTasks(null, 'Pending'),
      getAllFraudCases('Open'),
      getAllAppeals(),
    ]).then(([claimsRes, tasksRes, fraudRes, appealsRes]) => {

      // ── Claims awaiting review ─────────────────────────────────────────────
      // Staff needs to act on DocsVerificationPending (verify docs + trigger adjudication)
      // and UnderReview (manual adjudication decision). Sorted Urgent → High → Normal.
      if (claimsRes.status === 'fulfilled') {
        const reviewClaims = claimsRes.value
          .filter(c => c.status === 'DocsVerificationPending' || c.status === 'UnderReview')
          .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
        setClaimsAwaitingReview(reviewClaims);
        setPendingClaims(reviewClaims.length);
      } else {
        setClaimsAwaitingReview([]);
        setPendingClaims(0);
      }

      // ── Tasks ──────────────────────────────────────────────────────────────
      if (tasksRes.status === 'fulfilled') {
        setTasksList(tasksRes.value);
        setMyTasks(tasksRes.value.length);
      } else {
        setTasksList([]);
        setMyTasks(0);
      }

      // ── Fraud alerts ───────────────────────────────────────────────────────
      if (fraudRes.status === 'fulfilled')
        setFraudAlerts(fraudRes.value.length);

      // ── Open appeals ───────────────────────────────────────────────────────
      if (appealsRes.status === 'fulfilled')
        setOpenAppeals(
          appealsRes.value.filter(
            a => a.status === 'Filed' || a.status === 'UnderReview'
          ).length
        );

      setStatsLoading(false);
    });
  }, []);

  // ── KPI helpers ────────────────────────────────────────────────────────────
  function getKPI(name)             { return kpis.find(k => k.name === name); }
  function getPercent(kpi)          { if (!kpi || kpi.currentValue == null) return 0; return Math.min(Math.round(kpi.currentValue), 100); }
  function getStatus(kpi, inv = false) {
    if (!kpi || kpi.currentValue == null) return 'No data';
    return inv
      ? (kpi.currentValue <= kpi.target ? 'On target' : 'Below target')
      : (kpi.currentValue >= kpi.target ? 'On target' : 'Below target');
  }
  function getColor(kpi, inv = false) {
    if (!kpi || kpi.currentValue == null) return '#9e9e9e';
    return inv
      ? (kpi.currentValue <= kpi.target ? '#0d6efd' : '#ef4444')
      : (kpi.currentValue >= kpi.target ? '#0d6efd' : '#ef4444');
  }

  const adjKPI    = getKPI('Auto-Adjudication Rate');
  const tatKPI    = getKPI('Average TAT');
  const denialKPI = getKPI('Denial Rate');
  const fraudKPI  = getKPI('Fraud Flag Rate');

  // ── Panel loading guard — null means still loading, [] means loaded + empty ─
  const claimsLoaded = claimsAwaitingReview !== null;
  const tasksLoaded  = tasksList !== null;

  return (
    <Container fluid className="p-0">

      <WelcomeBanner emoji="👋" />

      <div className="px-4 pb-4">

        {/* ── Fraud alert priority bar ──────────────────────────────────── */}
        {!statsLoading && fraudAlerts > 0 && (
          <PriorityActionBar
            accentColor="danger"
            icon="bi-shield-exclamation"
            title={`${fraudAlerts} fraud alert${fraudAlerts > 1 ? 's' : ''} need investigation`}
            description="High-risk claims have been flagged and require your review."
            buttonLabel="View Fraud Cases"
            buttonIcon="bi-shield-exclamation"
            onButtonClick={() => navigate('/staff/fraud')}
          />
        )}

        {/* ── Stat cards ────────────────────────────────────────────────── */}
        <Row className="g-3 mb-4">
          <Col md={6} lg={3}>
            <StatCard
              label="Claims Pending"
              value={statsLoading ? '…' : pendingClaims ?? '—'}
              icon="bi-file-earmark-text"
              borderColor="primary"
              footerIcon="bi-clock"
              footerText={statsLoading ? 'Loading…' :
                pendingClaims === 0 ? 'No pending claims' : `${pendingClaims} awaiting review`}
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="My Tasks"
              value={statsLoading ? '…' : myTasks ?? '—'}
              icon="bi-list-check"
              borderColor="success"
              footerIcon="bi-clipboard-check"
              footerText={statsLoading ? 'Loading…' :
                myTasks === 0 ? 'All caught up!' : `${myTasks} task${myTasks !== 1 ? 's' : ''} pending`}
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="Fraud Alerts"
              value={statsLoading ? '…' : fraudAlerts ?? '—'}
              icon="bi-shield-exclamation"
              borderColor="warning"
              footerIcon="bi-shield"
              footerText={statsLoading ? 'Loading…' :
                fraudAlerts === 0 ? 'No active alerts' : `${fraudAlerts} case${fraudAlerts !== 1 ? 's' : ''} open`}
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="Appeals Open"
              value={statsLoading ? '…' : openAppeals ?? '—'}
              icon="bi-megaphone"
              borderColor="danger"
              footerIcon="bi-megaphone-fill"
              footerText={statsLoading ? 'Loading…' :
                openAppeals === 0 ? 'No open appeals' : `${openAppeals} appeal${openAppeals !== 1 ? 's' : ''} open`}
            />
          </Col>
        </Row>

        {/* ── KPI row ───────────────────────────────────────────────────── */}
        <SectionHeader title="My Performance Metrics" live />
        <Row className="g-3 mb-4">
          <Col md={6} lg={3}>
            <CircularKPI
              value={kpisLoading ? '…' : adjKPI ? `${adjKPI.currentValue}` : '—'}
              unit="%" label="Auto-Adjudication" target="Target: ≥ 80%"
              status={kpisLoading ? 'Loading…' : getStatus(adjKPI)}
              color={kpisLoading ? '#9e9e9e' : getColor(adjKPI)}
              percent={kpisLoading ? 0 : getPercent(adjKPI)}
            />
          </Col>
          <Col md={6} lg={3}>
            <CircularKPI
              value={kpisLoading ? '…' : tatKPI ? `${tatKPI.currentValue}` : '—'}
              unit="hrs" label="Average TAT" target="Target: ≤ 4 hrs"
              status={kpisLoading ? 'Loading…' : getStatus(tatKPI, true)}
              color={kpisLoading ? '#9e9e9e' : getColor(tatKPI, true)}
              percent={kpisLoading ? 0 : getPercent(tatKPI)}
            />
          </Col>
          <Col md={6} lg={3}>
            <CircularKPI
              value={kpisLoading ? '…' : denialKPI ? `${denialKPI.currentValue}` : '—'}
              unit="%" label="Denial Rate" target="Target: < 10%"
              status={kpisLoading ? 'Loading…' : getStatus(denialKPI, true)}
              color={kpisLoading ? '#9e9e9e' : getColor(denialKPI, true)}
              percent={kpisLoading ? 0 : getPercent(denialKPI)}
            />
          </Col>
          <Col md={6} lg={3}>
            <CircularKPI
              value={kpisLoading ? '…' : fraudKPI ? `${fraudKPI.currentValue}` : '—'}
              unit="%" label="Fraud Flag Rate" target="Target: < 5%"
              status={kpisLoading ? 'Loading…' : getStatus(fraudKPI, true)}
              color={kpisLoading ? '#9e9e9e' : getColor(fraudKPI, true)}
              percent={kpisLoading ? 0 : getPercent(fraudKPI)}
            />
          </Col>
        </Row>

        {/* ── Main panels ───────────────────────────────────────────────── */}
        <Row className="g-3 mb-4">

          {/* ── Claims Awaiting Review ───────────────────────────────── */}
          <Col lg={7}>
            <DashboardPanel
              icon="bi-file-earmark-text"
              iconColor="primary"
              title="Claims Awaiting Review"
              subtitle="Pending your decision · sorted by priority"
            >
              {/* Loading skeleton */}
              {!claimsLoaded && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '0.83rem' }}>
                  <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                  Loading claims…
                </div>
              )}

              {/* Empty state */}
              {claimsLoaded && claimsAwaitingReview.length === 0 && (
                <EmptyStatePanel
                  icon="bi-inbox"
                  title="No claims to review"
                  description="High-priority claims will appear here first."
                />
              )}

              {/* Claim rows */}
              {claimsLoaded && claimsAwaitingReview.length > 0 && (
                <>
                  {claimsAwaitingReview.slice(0, 5).map((claim, idx) => {
                    const pStyle = PRIORITY_STYLE[claim.priority] ?? PRIORITY_STYLE.Normal;
                    const sStyle = STATUS_STYLE[claim.status]   ?? { bg: '#f3f4f6', color: '#6b7280' };
                    const isLast = idx === Math.min(claimsAwaitingReview.length, 5) - 1
                                && claimsAwaitingReview.length <= 5;
                    return (
                      <div
                        key={claim.claimID}
                        onClick={() => navigate('/staff/claims')}
                        onMouseEnter={onRowEnter}
                        onMouseLeave={onRowLeave}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 16px',
                          borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                          cursor: 'pointer', transition: 'background 0.12s',
                        }}
                      >
                        {/* Priority badge */}
                        <span style={{
                          fontSize: '0.63rem', fontWeight: 700,
                          padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                          background: pStyle.bg, color: pStyle.color,
                          border: `1px solid ${pStyle.border}`,
                          whiteSpace: 'nowrap',
                        }}>
                          {claim.priority}
                        </span>

                        {/* Claim info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.83rem', fontWeight: 600, color: '#111827',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            CLM-{claim.claimID} · {claim.memberName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 1 }}>
                            {claim.claimType} · {claim.providerName} · {fmtDate(claim.submittedAt)}
                          </div>
                        </div>

                        {/* Amount */}
                        <div style={{
                          fontSize: '0.82rem', fontWeight: 700,
                          color: '#1d4ed8', flexShrink: 0,
                        }}>
                          {fmtCurrency(claim.totalBilledAmount)}
                        </div>

                        {/* Status badge */}
                        <span style={{
                          fontSize: '0.63rem', fontWeight: 600,
                          padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                          background: sStyle.bg, color: sStyle.color,
                          whiteSpace: 'nowrap',
                        }}>
                          {STATUS_LABEL[claim.status] ?? claim.status}
                        </span>

                        <i className="bi bi-chevron-right" style={{ color: '#d1d5db', fontSize: '0.7rem', flexShrink: 0 }} />
                      </div>
                    );
                  })}

                  {/* "View all" footer link */}
                  {claimsAwaitingReview.length > 5 && (
                    <div style={{
                      padding: '10px 16px', textAlign: 'center',
                      borderTop: '1px solid #f3f4f6',
                    }}>
                      <button
                        onClick={() => navigate('/staff/claims')}
                        style={{
                          background: 'none', border: 'none',
                          color: '#3b82f6', fontSize: '0.8rem',
                          fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        View all {claimsAwaitingReview.length} claims →
                      </button>
                    </div>
                  )}
                </>
              )}
            </DashboardPanel>
          </Col>

          {/* ── My Tasks ─────────────────────────────────────────────── */}
          <Col lg={5}>
            <DashboardPanel
              icon="bi-list-check"
              iconColor="success"
              title="My Tasks"
              subtitle="Assigned to you"
            >
              {/* Loading skeleton */}
              {!tasksLoaded && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '0.83rem' }}>
                  <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                  Loading tasks…
                </div>
              )}

              {/* Empty state */}
              {tasksLoaded && tasksList.length === 0 && (
                <EmptyStatePanel
                  icon="bi-check-circle"
                  title="All caught up!"
                  description="Tasks assigned to you will appear here."
                />
              )}

              {/* Task rows */}
              {tasksLoaded && tasksList.length > 0 && (
                <>
                  {tasksList.slice(0, 5).map((task, idx) => {
                    const dotColor = task.priority === 'Urgent' ? '#ef4444'
                                   : task.priority === 'High'   ? '#f59e0b'
                                   : '#10b981';
                    const isLast = idx === Math.min(tasksList.length, 5) - 1
                                && tasksList.length <= 5;
                    return (
                      <div
                        key={task.taskID}
                        onClick={() => navigate('/staff/tasks')}
                        onMouseEnter={onRowEnter}
                        onMouseLeave={onRowLeave}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 16px',
                          borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                          cursor: 'pointer', transition: 'background 0.12s',
                        }}
                      >
                        {/* Priority dot */}
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: dotColor, flexShrink: 0,
                        }} />

                        {/* Task info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '0.83rem', fontWeight: 600, color: '#111827',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {task.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 1 }}>
                            {task.claimID ? `CLM-${task.claimID} · ` : ''}
                            {task.dueDate ? `Due ${fmtDate(task.dueDate)}` : 'No due date'}
                          </div>
                        </div>

                        <i className="bi bi-chevron-right" style={{ color: '#d1d5db', fontSize: '0.7rem', flexShrink: 0 }} />
                      </div>
                    );
                  })}

                  {/* "View all" footer link */}
                  {tasksList.length > 5 && (
                    <div style={{
                      padding: '10px 16px', textAlign: 'center',
                      borderTop: '1px solid #f3f4f6',
                    }}>
                      <button
                        onClick={() => navigate('/staff/tasks')}
                        style={{
                          background: 'none', border: 'none',
                          color: '#10b981', fontSize: '0.8rem',
                          fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        View all {tasksList.length} tasks →
                      </button>
                    </div>
                  )}
                </>
              )}
            </DashboardPanel>
          </Col>

        </Row>

        {/* ── Quick Access ──────────────────────────────────────────────── */}
        <h5 className="fw-semibold mb-3">Quick Access</h5>
        <QuickAccessGrid
          items={myMenu}
          onItemClick={(item) => navigate(item.path)}
        />

      </div>
    </Container>
  );
}
