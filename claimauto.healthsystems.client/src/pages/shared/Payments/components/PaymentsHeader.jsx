import { Alert } from 'react-bootstrap';
import { useAuth } from '../../../../security/AuthContext';
import { canAccess } from '../../../../security/permissions';

export default function PaymentsHeader({
  successMsg,
  errorMsg,
  activeTab,
  onTabChange,
  onCreateClick,
}) {
  const { user }     = useAuth();
  const isStaff      = canAccess(user?.role, ['InsuranceStaff']);
  const isAdmin      = canAccess(user?.role, ['Admin']);
  const canReconcile = isStaff || isAdmin;

  // ── Title + subtitle change based on active tab ───────────────
  const title    = activeTab === 'reconciliation'
    ? 'Reconciliation'
    : 'Payments';
  const subtitle = activeTab === 'reconciliation'
    ? 'Generate and download payment reconciliation reports · showing last 7 days'
    : 'Manage claim disbursements — Pending → Authorized → Executed';

  return (
    <div className="px-4 pt-3 mb-0">

      {/* ── Title + New Payment button ──────────────────────── */}
      <div className="d-flex align-items-center
        justify-content-between flex-wrap gap-3 mb-3">
        <div className="d-flex align-items-center">
          <i className={`${activeTab === 'reconciliation'
            ? 'bi-clipboard-data'
            : 'bi-credit-card'} bi fs-2 text-primary me-3`}>
          </i>
          <div>
            <h3 className="fw-bold mb-0">{title}</h3>
            <small className="text-muted">{subtitle}</small>
          </div>
        </div>

        {isStaff && activeTab === 'payments' && (
          <button
            className="btn fw-semibold text-white rounded-pill px-4"
            onClick={onCreateClick}
            style={{
              background:
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
            }}
          >
            <i className="bi bi-plus-lg me-2"></i>
            New Payment
          </button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '2px solid #e9ecef',
        marginBottom: 0,
      }}>
        <button
          onClick={() => onTabChange('payments')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: 14,
            color: activeTab === 'payments'
              ? '#667eea' : '#6c757d',
            borderBottom: activeTab === 'payments'
              ? '2px solid #667eea' : '2px solid transparent',
            marginBottom: -2,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <i className="bi bi-credit-card me-2"></i>
          Payments
        </button>

        {canReconcile && (
          <button
            onClick={() => onTabChange('reconciliation')}
            style={{
              background: 'none',
              border: 'none',
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: 14,
              color: activeTab === 'reconciliation'
                ? '#667eea' : '#6c757d',
              borderBottom: activeTab === 'reconciliation'
                ? '2px solid #667eea' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <i className="bi bi-clipboard-data me-2"></i>
            Reconciliation
          </button>
        )}
      </div>

      {/* ── Toasts ─────────────────────────────────────────── */}
      {successMsg && (
        <Alert variant="success"
          className="d-flex align-items-center py-2 mb-0 mt-3">
          <i className="bi bi-check-circle-fill me-2"></i>
          {successMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="danger"
          className="d-flex align-items-center py-2 mb-0 mt-3">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {errorMsg}
        </Alert>
      )}
    </div>
  );
}