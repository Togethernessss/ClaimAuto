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

  const title    = activeTab === 'reconciliation' ? 'Reconciliation' : 'Payments';
  const subtitle = activeTab === 'reconciliation'
    ? 'Generate and download payment reconciliation reports · showing last 7 days'
    : 'Manage claim disbursements — Pending → Authorized → Executed';
  const iconClass = activeTab === 'reconciliation' ? 'bi-clipboard-data' : 'bi-credit-card';

  return (
    <div className="mb-0">

      {/* ── Gradient Banner ─────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 18,
          padding: '28px 32px',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 0,
        }}
      >
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 130, height: 130, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -20, right: 80,
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
        }} />

        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3"
          style={{ position: 'relative', zIndex: 1 }}>

          {/* Icon + text */}
          <div className="d-flex align-items-center gap-3">
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className={`bi ${iconClass}`} style={{ fontSize: 24, color: '#fff' }}></i>
            </div>
            <div>
              <h3 className="fw-bold mb-0" style={{ color: '#fff', lineHeight: 1.2 }}>{title}</h3>
              <small style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13 }}>{subtitle}</small>
            </div>
          </div>

          {/* New Payment button — only for staff on payments tab */}
          {isStaff && activeTab === 'payments' && (
            <button
              onClick={onCreateClick}
              style={{
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 12,
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                padding: '9px 22px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            >
              <i className="bi bi-plus-lg"></i>
              New Payment
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '2px solid #e9ecef',
        background: '#fff',
        paddingLeft: 8,
        marginBottom: 0,
      }}>
        <button
          onClick={() => onTabChange('payments')}
          style={{
            background: 'none',
            border: 'none',
            padding: '11px 22px',
            fontWeight: 600,
            fontSize: 14,
            color: activeTab === 'payments' ? '#667eea' : '#6c757d',
            borderBottom: activeTab === 'payments'
              ? '2px solid #667eea' : '2px solid transparent',
            marginBottom: -2,
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 7,
          }}
        >
          <i className="bi bi-credit-card"></i>
          Payments
        </button>

        {canReconcile && (
          <button
            onClick={() => onTabChange('reconciliation')}
            style={{
              background: 'none',
              border: 'none',
              padding: '11px 22px',
              fontWeight: 600,
              fontSize: 14,
              color: activeTab === 'reconciliation' ? '#667eea' : '#6c757d',
              borderBottom: activeTab === 'reconciliation'
                ? '2px solid #667eea' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            <i className="bi bi-clipboard-data"></i>
            Reconciliation
          </button>
        )}
      </div>

      {/* ── Inline toast messages ───────────────────────────────── */}
      {successMsg && (
        <div style={{
          marginTop: 12,
          padding: '10px 16px',
          borderRadius: 10,
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          fontSize: 14,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <i className="bi bi-check-circle-fill" style={{ color: '#16a34a' }}></i>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{
          marginTop: 12,
          padding: '10px 16px',
          borderRadius: 10,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          fontSize: 14,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ color: '#dc2626' }}></i>
          {errorMsg}
        </div>
      )}
    </div>
  );
}
